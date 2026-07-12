/** The app's real public-facing base URL — used for any absolute link
 * embedded outside a browser request/response cycle (email links).
 * req.nextUrl.origin can't be trusted for this: behind the Caddy reverse
 * proxy it resolves to the internal upstream bind address
 * (http://localhost:4000) instead of the address the user's browser
 * actually used, producing unreachable links in emails. Set APP_URL in
 * .env.local to the real public origin (e.g. https://203.0.113.5). */
export function getAppUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:4000").replace(/\/$/, "");
}
