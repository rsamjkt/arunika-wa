import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/users";
import { createResetToken } from "@/lib/passwordResets";
import { passwordResetEmail, sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
  }

  // Always respond the same way whether or not the email exists —
  // don't leak account existence to the caller.
  const user = findUserByEmail(email.trim());
  if (user) {
    const token = createResetToken(user.id);
    const resetUrl = `${req.nextUrl.origin}/reset-password/${token}`;
    const { subject, html } = passwordResetEmail(resetUrl);
    sendEmail(user.email!, subject, html).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
