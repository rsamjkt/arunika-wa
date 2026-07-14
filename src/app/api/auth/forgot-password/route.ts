import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/users";
import { createResetToken } from "@/lib/passwordResets";
import { passwordResetEmail, sendEmail } from "@/lib/email";
import { notifyAdminPasswordReset } from "@/lib/adminNotify";
import { getAppUrl } from "@/lib/appUrl";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function POST(req: NextRequest) {
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { email } = body!;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
  }

  // Always respond the same way whether or not the email exists —
  // don't leak account existence to the caller.
  const user = findUserByEmail(email.trim());
  if (user) {
    const token = createResetToken(user.id);
    const resetUrl = `${getAppUrl()}/reset-password/${token}`;
    const { subject, html } = passwordResetEmail(resetUrl);
    sendEmail(user.email!, subject, html).catch(() => {});
    notifyAdminPasswordReset(user.username, user.email!);
  }

  return NextResponse.json({ ok: true });
}
