import { describe, expect, it } from "vitest";
import { isSafeExternalUrl } from "./urlSafety";

describe("isSafeExternalUrl", () => {
  it("allows a normal public https URL", async () => {
    expect(await isSafeExternalUrl("https://example.com/image.jpg")).toBe(true);
  });

  it("allows a normal public http URL", async () => {
    expect(await isSafeExternalUrl("http://example.com/file.pdf")).toBe(true);
  });

  it("rejects malformed URLs", async () => {
    expect(await isSafeExternalUrl("not a url")).toBe(false);
    expect(await isSafeExternalUrl("")).toBe(false);
  });

  it("rejects non-http(s) protocols", async () => {
    expect(await isSafeExternalUrl("file:///etc/passwd")).toBe(false);
    expect(await isSafeExternalUrl("ftp://example.com/x")).toBe(false);
    expect(await isSafeExternalUrl("data:text/plain;base64,aGk=")).toBe(false);
  });

  it("rejects localhost", async () => {
    expect(await isSafeExternalUrl("http://localhost/admin")).toBe(false);
    expect(await isSafeExternalUrl("http://LOCALHOST:3000/")).toBe(false);
  });

  it("rejects literal loopback/private/link-local IPv4 addresses", async () => {
    expect(await isSafeExternalUrl("http://127.0.0.1/")).toBe(false);
    expect(await isSafeExternalUrl("http://127.1/")).toBe(false); // short form of 127.x
    expect(await isSafeExternalUrl("http://10.0.0.5/")).toBe(false);
    expect(await isSafeExternalUrl("http://172.16.0.1/")).toBe(false);
    expect(await isSafeExternalUrl("http://172.31.255.255/")).toBe(false);
    expect(await isSafeExternalUrl("http://192.168.1.1/")).toBe(false);
    expect(await isSafeExternalUrl("http://169.254.169.254/latest/meta-data/")).toBe(false); // cloud metadata
    expect(await isSafeExternalUrl("http://0.0.0.0/")).toBe(false);
    expect(await isSafeExternalUrl("http://0/")).toBe(false); // resolves to 0.0.0.0 on many OSes
  });

  it("does not reject public IPv4 addresses that merely resemble private ranges", async () => {
    // 172.32.x.x is OUTSIDE the 172.16.0.0/12 private block (which ends at 172.31.x.x) — must not be blocked.
    expect(await isSafeExternalUrl("http://172.32.0.1/")).toBe(true);
    // 172.15.x.x is also outside the private block (below the range).
    expect(await isSafeExternalUrl("http://172.15.255.255/")).toBe(true);
  });

  it("rejects literal loopback/private/link-local IPv6 addresses", async () => {
    expect(await isSafeExternalUrl("http://[::1]/")).toBe(false);
    expect(await isSafeExternalUrl("http://[fe80::1]/")).toBe(false);
    expect(await isSafeExternalUrl("http://[fc00::1]/")).toBe(false);
    expect(await isSafeExternalUrl("http://[fd12:3456::1]/")).toBe(false);
  });

  it("rejects IPv4-mapped IPv6 loopback (a known regex-blocklist bypass)", async () => {
    expect(await isSafeExternalUrl("http://[::ffff:127.0.0.1]/")).toBe(false);
    expect(await isSafeExternalUrl("http://[::ffff:169.254.169.254]/")).toBe(false);
  });

  it("resolves a real public hostname's DNS before allowing it", async () => {
    // example.com is a stable, well-known public domain — this exercises
    // the actual dns.lookup() path, not just literal-IP short-circuiting.
    expect(await isSafeExternalUrl("https://example.com/")).toBe(true);
  });

  it("rejects a hostname that fails to resolve", async () => {
    expect(await isSafeExternalUrl("http://this-domain-should-not-exist-arunika-test.invalid/")).toBe(false);
  });
});
