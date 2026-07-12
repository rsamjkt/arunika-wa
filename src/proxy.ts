import { NextRequest, NextResponse } from "next/server";
import { deleteSession, getSession } from "@/lib/sessions";
import { validateApiKey } from "@/lib/apikeys";
import { getFullUser, getGoverningUser } from "@/lib/users";

const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth/login",
  "/api/register",
  "/forgot-password",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
]);
// GET is a public plan catalog (needed for the registration page); the
// route itself gates POST/PATCH/DELETE behind requireSuperadmin().
// /register(/pay/...), /api/qris/status/..., and /reset-password/[token]
// must be reachable before a session/account exists.
const PUBLIC_PREFIXES = ["/api/plans", "/register", "/api/qris/status", "/reset-password", "/help"];
const SESSION_COOKIE = "arunika_session";
// User & API-key management must only ever be reachable from a logged-in
// browser session — never via X-Api-Key, even though it lives under /api/.
const COOKIE_ONLY_PREFIXES = [
  "/api/users",
  "/api/api-keys",
  "/api/webhook-config",
  "/api/autoreply",
  "/api/account",
  "/api/team",
  "/api/admin",
  "/api/referrals",
];
// Called by an external service, not a browser or an app-issued API key —
// each authenticates the request itself (HMAC / stored signature) instead.
const SELF_VERIFIED_PATHS = new Set([
  "/api/webhooks/waha",
  "/api/webhooks/klikqris",
  "/api/cron/downgrade-expired",
  "/api/cron/run-scheduled-campaigns",
  "/api/cron/lead-outreach",
]);
// Platform-owner-only area — a valid session isn't enough, role must be superadmin.
// /settings/users manages platform-staff accounts, not tenant data, so it
// belongs here too even though it isn't under /admin. /api/admin is listed
// explicitly too — it doesn't share the /admin prefix, so without this a
// logged-in tenant session (not just a stray API key) would reach every
// /api/admin/* route and rely solely on that route's own requireSuperadmin()
// check as the only thing standing between them and another tenant's data.
const ADMIN_PREFIXES = ["/admin", "/settings/users", "/api/admin"];
// Tenant-owner-only area — billing and team membership stay off-limits to
// staff logins, which share the owner's plan/quota/devices but not control
// over them.
const TENANT_OWNER_PREFIXES = [
  "/settings/team",
  "/api/team",
  "/account/plan",
  "/api/account",
  "/account/referral",
  "/api/referrals",
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const session = cookie ? getSession(cookie) : null;

  // "/" is the public marketing landing page for logged-out visitors, and
  // a redirect straight to the dashboard for anyone already signed in.
  if (pathname === "/") {
    return session ? NextResponse.redirect(new URL("/dashboard", req.url)) : NextResponse.next();
  }

  if (
    PUBLIC_PATHS.has(pathname) ||
    SELF_VERIFIED_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  if (session) {
    const user = getFullUser(session.userId);
    if (user && user.role !== "superadmin" && getGoverningUser(user).suspended) {
      deleteSession(cookie!);
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("suspended", "1");
      return pathname.startsWith("/api/")
        ? NextResponse.json({ error: "Akun ini telah dinonaktifkan. Hubungi admin platform." }, { status: 403 })
        : NextResponse.redirect(loginUrl);
    }
    if (ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) {
      if (user?.role !== "superadmin") {
        return pathname.startsWith("/api/")
          ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
          : NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    if (TENANT_OWNER_PREFIXES.some((p) => pathname.startsWith(p))) {
      if (user?.role !== "tenant" && user?.role !== "superadmin") {
        return pathname.startsWith("/api/")
          ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
          : NextResponse.redirect(new URL("/dashboard", req.url));
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
        const owner = getFullUser(record.ownerId);
        if (owner && getGoverningUser(owner).suspended) {
          return NextResponse.json({ error: "Akun ini telah dinonaktifkan." }, { status: 403 });
        }
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
