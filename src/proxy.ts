import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";
import { validateApiKey } from "@/lib/apikeys";
import { getFullUser } from "@/lib/users";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/register"]);
// GET is a public plan catalog (needed for the registration page); the
// route itself gates POST/PATCH/DELETE behind requireSuperadmin().
// /register(/pay/...) and /api/qris/status/... must be reachable before
// a session/account exists, during sign-up and while paying for a plan.
const PUBLIC_PREFIXES = ["/api/plans", "/register", "/api/qris/status"];
const SESSION_COOKIE = "arunika_session";
// User & API-key management must only ever be reachable from a logged-in
// browser session — never via X-Api-Key, even though it lives under /api/.
const COOKIE_ONLY_PREFIXES = [
  "/api/users",
  "/api/api-keys",
  "/api/webhook-config",
  "/api/autoreply",
  "/api/account",
];
// Called by an external service, not a browser or an app-issued API key —
// each authenticates the request itself (HMAC / stored signature) instead.
const SELF_VERIFIED_PATHS = new Set([
  "/api/webhooks/waha",
  "/api/webhooks/klikqris",
  "/api/cron/downgrade-expired",
]);
// Platform-owner-only area — a valid session isn't enough, role must be superadmin.
const ADMIN_PREFIXES = ["/admin"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.has(pathname) ||
    SELF_VERIFIED_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const session = cookie ? getSession(cookie) : null;

  if (session) {
    if (ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) {
      const user = getFullUser(session.userId);
      if (user?.role !== "superadmin") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const cookieOnly = COOKIE_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
    if (!cookieOnly) {
      // Programmatic/external callers (bots, integrations, other apps) don't
      // carry the browser's login cookie — let them in with an API key instead.
      const apiKey = req.headers.get("x-api-key");
      const record = apiKey ? validateApiKey(apiKey) : null;
      if (record) {
        return NextResponse.next();
      }
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/).*)"],
};
