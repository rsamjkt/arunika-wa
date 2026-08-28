import { NextRequest, NextResponse } from "next/server";
import { changePassword, findUserById } from "@/lib/users";
import { consumeResetToken } from "@/lib/passwordResets";
import { deleteSessionsForUser } from "@/lib/sessions";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { passwordChangedEmail, sendEmail } from "@/lib/email";
import { notifyAdminPasswordChanged } from "@/lib/adminNotify";

export async function POST(req: NextRequest) {
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { token, password } = body!;
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

  // Konfirmasi ke user + notifikasi ke admin — fire-and-forget.
  const user = findUserById(userId);
  if (user) {
    if (user.email) {
      const { subject, html } = passwordChangedEmail(user.username);
      sendEmail(user.email, subject, html).catch(() => {});
    }
    notifyAdminPasswordChanged(user.username);
  }

  return NextResponse.json({ ok: true });
}
