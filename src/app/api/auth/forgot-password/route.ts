import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/users";
import { createResetToken } from "@/lib/passwordResets";
import { passwordResetEmail, sendEmail } from "@/lib/email";
import { notifyAdminPasswordReset } from "@/lib/adminNotify";
import { getAppUrl } from "@/lib/appUrl";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { checkAndCountRequest, clientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { email } = body!;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
  }

  // Unthrottled, this endpoint can be used to email-bomb a victim (real
  // email sent regardless of the response) and spam the platform admin's
  // own inbox via notifyAdminPasswordReset — throttle by IP and by the
  // target email so an attacker can't just rotate IPs to keep hammering
  // one victim. Checked before the account-existence branch so both
  // outcomes are throttled identically and existence still isn't leaked.
  const ip = clientIp(req.headers);
  const emailKey = email.trim().toLowerCase();
  const okByIp = checkAndCountRequest(`forgot-ip:${ip}`, 5, 15 * 60 * 1000);
  const okByEmail = checkAndCountRequest(`forgot-email:${emailKey}`, 3, 15 * 60 * 1000);
  if (!okByIp || !okByEmail) {
    return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi nanti." }, { status: 429 });
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
