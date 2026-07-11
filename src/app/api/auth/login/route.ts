import { NextRequest, NextResponse } from "next/server";
import { verifyLogin } from "@/lib/users";
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

  const { username, password } = await req.json();

  const user = verifyLogin(username, password);
  if (!user) {
    recordFailure(ip);
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }
  recordSuccess(ip);

  const token = createSession(user.id, user.username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("arunika_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
