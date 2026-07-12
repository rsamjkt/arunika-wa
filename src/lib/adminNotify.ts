import { sendText } from "./waha";
import { adminPasswordResetNotifyEmail, sendEmail } from "./email";

const PHONE = process.env.ADMIN_NOTIFY_PHONE ?? "";
const SESSION = process.env.ADMIN_NOTIFY_SESSION ?? "";
const EMAIL = process.env.ADMIN_NOTIFY_EMAIL || process.env.EMAIL_FROM || "";

/** Best-effort, fire-and-forget — a monitoring notification must never
 * block or fail the tenant-facing password-reset flow. */
export function notifyAdminPasswordReset(username: string, userEmail: string): void {
  if (PHONE && SESSION) {
    const when = new Date().toLocaleString("id-ID");
    const text = `🔐 Permintaan reset password\n\nUser: ${username}\nEmail: ${userEmail}\nWaktu: ${when}`;
    sendText(SESSION, `${PHONE}@c.us`, text).catch((err) => {
      console.error("[adminNotify] WA send failed:", err instanceof Error ? err.message : err);
    });
  }

  if (EMAIL) {
    const { subject, html } = adminPasswordResetNotifyEmail(username, userEmail);
    sendEmail(EMAIL, subject, html).catch(() => {});
  }
}
