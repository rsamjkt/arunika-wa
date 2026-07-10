import { NextRequest, NextResponse } from "next/server";
import { verifyLogin } from "@/lib/users";
import { createSession } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const user = verifyLogin(username, password);
  if (!user) {
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }

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
