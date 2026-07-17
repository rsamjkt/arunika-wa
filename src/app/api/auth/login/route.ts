import { NextRequest, NextResponse } from "next/server";
import { getGoverningUser, verifyLogin } from "@/lib/users";
import { createSession } from "@/lib/sessions";
import { checkRateLimit, clientIp, recordFailure, recordSuccess } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${rate.retryAfterSec} detik.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  let username, password;
  try {
    ({ username, password } = await req.json());
  } catch {
    // Still counts as a failed attempt — a malformed body must not be a
    // free way to probe the login endpoint without tripping the rate limit.
    recordFailure(ip);
    return NextResponse.json({ error: "Body permintaan tidak valid" }, { status: 400 });
  }

  const user = verifyLogin(username, password);
  if (!user) {
    recordFailure(ip);
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }
  if (getGoverningUser(user).suspended) {
    recordFailure(ip);
    return NextResponse.json(
      { error: "Akun ini telah dinonaktifkan. Hubungi admin platform." },
      { status: 403 },
    );
  }
  recordSuccess(ip);

  const token = createSession(user.id, user.username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("arunika_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
