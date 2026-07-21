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

// isSafeExternalUrl is NOT mocked here — this test exercises the real
// integration to guard against the regression found in the security
// audit (a tenant-supplied webhook URL was fetched with zero validation).
const fetchSpy = vi.fn();
vi.stubGlobal("fetch", fetchSpy);

import { testOutboundWebhook, updateWebhookConfig } from "./webhookConfig";

beforeEach(() => {
  fakeFiles.clear();
  fetchSpy.mockReset();
});

describe("webhook URL SSRF protection", () => {
  it("testOutboundWebhook rejects a URL pointing at a private/internal address without ever calling fetch", async () => {
    updateWebhookConfig("tenant-1", { url: "http://169.254.169.254/latest/meta-data/", enabled: true });

    const result = await testOutboundWebhook("tenant-1");

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/internal/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("testOutboundWebhook rejects a localhost URL without calling fetch", async () => {
    updateWebhookConfig("tenant-2", { url: "http://localhost:5432/admin", enabled: true });

    const result = await testOutboundWebhook("tenant-2");

    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("testOutboundWebhook proceeds to fetch for a legitimate public URL", async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, type: "default" });
    updateWebhookConfig("tenant-3", { url: "https://example.com/webhook", enabled: true });

    const result = await testOutboundWebhook("tenant-3");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
  });

  it("treats a redirect response as a failed (not followed) delivery", async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 302, type: "opaqueredirect" });
    updateWebhookConfig("tenant-4", { url: "https://example.com/webhook", enabled: true });

    const result = await testOutboundWebhook("tenant-4");

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/redirect/i);
  });
});
