// Shared guard for any server-side fetch of a caller-supplied URL — used
// wherever this app (or, via file.url, the WA engine on our behalf) fetches
// a URL that ultimately traces back to tenant/attacker input. Rejects
// anything pointing at loopback/private/link-local/cloud-metadata
// addresses so it can't be turned into an internal-network probe against
// this server or its private-network neighbors.
const PRIVATE_HOST_RE = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0$|\[?::1\]?$)/i;

export function isSafeExternalUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (url.protocol === "http:" || url.protocol === "https:") && !PRIVATE_HOST_RE.test(url.hostname);
  } catch {
    return false;
  }
}
