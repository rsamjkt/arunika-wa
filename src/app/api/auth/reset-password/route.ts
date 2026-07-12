import { NextRequest, NextResponse } from "next/server";
import { changePassword } from "@/lib/users";
import { consumeResetToken } from "@/lib/passwordResets";
import { deleteSessionsForUser } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }

  const userId = consumeResetToken(token);
  if (!userId) {
    return NextResponse.json({ error: "Link reset tidak valid atau sudah kedaluwarsa" }, { status: 400 });
  }

  changePassword(userId, password);
  deleteSessionsForUser(userId);
  return NextResponse.json({ ok: true });
}
