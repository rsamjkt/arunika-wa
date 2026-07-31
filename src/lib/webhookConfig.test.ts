import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeFiles = new Map<string, unknown>();
vi.mock("./store", () => ({
  readJson: (file: string, fallback: unknown) => (fakeFiles.has(file) ? fakeFiles.get(file) : fallback),
  writeJson: (file: string, data: unknown) => {
    fakeFiles.set(file, data);
  },
}));

vi.mock("./webhookLog", () => ({ logWebhookDelivery: vi.fn() }));
vi.mock("./notifications", () => ({ createNotification: vi.fn() }));

// Mock only `safeFetch` (the network seam); keep the rest of urlSafety real.
vi.mock("./urlSafety", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./urlSafety")>();
  return { ...actual, safeFetch: vi.fn() };
});

import * as urlSafety from "./urlSafety";
import { testOutboundWebhook, updateWebhookConfig } from "./webhookConfig";

beforeEach(() => {
  fakeFiles.clear();
  vi.mocked(urlSafety.safeFetch).mockReset();
});

describe("webhook send() behaviour", () => {
  it("delivers to a legitimate public URL", async () => {
    vi.mocked(urlSafety.safeFetch).mockResolvedValue({ ok: true, status: 200, redirect: false, text: "" });
    updateWebhookConfig("tenant-3", { url: "https://example.com/webhook", enabled: true });
    const result = await testOutboundWebhook("tenant-3");
    expect(urlSafety.safeFetch).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
  });

  it("treats a redirect response as a failed (not followed) delivery", async () => {
    vi.mocked(urlSafety.safeFetch).mockResolvedValue({ ok: false, status: 302, redirect: true, text: "" });
    updateWebhookConfig("tenant-4", { url: "https://example.com/webhook", enabled: true });
    const result = await testOutboundWebhook("tenant-4");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/redirect/i);
  });

  it("surfaces safeFetch's internal-address rejection", async () => {
    vi.mocked(urlSafety.safeFetch).mockResolvedValue({
      ok: false,
      status: 0,
      redirect: false,
      text: "",
      error: "URL menunjuk alamat internal / tidak valid",
    });
    updateWebhookConfig("tenant-1", { url: "http://169.254.169.254/latest/meta-data/", enabled: true });
    const result = await testOutboundWebhook("tenant-1");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/internal/i);
  });
});

describe("safeFetch real SSRF guard (literal internal addresses, no network)", () => {
  it("rejects cloud-metadata, localhost, and private ranges", async () => {
    const real = await vi.importActual<typeof import("./urlSafety")>("./urlSafety");
    expect((await real.safeFetch("http://169.254.169.254/latest/meta-data/")).ok).toBe(false);
    expect((await real.safeFetch("http://localhost:5432/admin")).ok).toBe(false);
    expect((await real.safeFetch("http://10.0.0.5/")).ok).toBe(false);
    expect((await real.safeFetch("http://[::1]/")).ok).toBe(false);
  });
});
