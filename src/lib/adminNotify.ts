import { sendText } from "./waha";
import { adminAlertEmail, adminPasswordResetNotifyEmail, sendEmail } from "./email";

const PHONE = process.env.ADMIN_NOTIFY_PHONE ?? "";
const SESSION = process.env.ADMIN_NOTIFY_SESSION ?? "";
const EMAIL = process.env.ADMIN_NOTIFY_EMAIL || process.env.EMAIL_FROM || "";

/** WIB (UTC+7) timestamp string for human-readable notifications. */
export function nowWIB(): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

/** Best-effort, fire-and-forget platform-admin monitoring notification —
 * a WhatsApp line to the admin's number + an email. Must never block or
 * throw into the tenant-facing flow that triggered it. */
function notifyAdmin(waText: string, email: { subject: string; html: string }): void {
  if (PHONE && SESSION) {
    sendText(SESSION, `${PHONE}@c.us`, waText).catch((err) => {
      console.error("[adminNotify] WA send failed:", err instanceof Error ? err.message : err);
    });
  }
  if (EMAIL) {
    sendEmail(EMAIL, email.subject, email.html).catch(() => {});
  }
}

/** Password-reset REQUEST (forgot-password) — kept for backward compatibility. */
export function notifyAdminPasswordReset(username: string, userEmail: string): void {
  if (PHONE && SESSION) {
    const text = `Permintaan reset password\n\nUser: ${username}\nEmail: ${userEmail}\nWaktu: ${nowWIB()}`;
    sendText(SESSION, `${PHONE}@c.us`, text).catch((err) => {
      console.error("[adminNotify] WA send failed:", err instanceof Error ? err.message : err);
    });
  }
  if (EMAIL) {
    const { subject, html } = adminPasswordResetNotifyEmail(username, userEmail);
    sendEmail(EMAIL, subject, html).catch(() => {});
  }
}

export function notifyAdminNewRegistration(username: string, userEmail: string, planName: string): void {
  const when = nowWIB();
  notifyAdmin(
    `🆕 Registrasi baru\n\nUser: ${username}\nEmail: ${userEmail}\nPaket: ${planName}\nWaktu: ${when}`,
    adminAlertEmail("Registrasi baru", [
      ["Username", username],
      ["Email", userEmail],
      ["Paket", planName],
      ["Waktu", when],
    ]),
  );
}

export function notifyAdminLogin(username: string, ip: string, device: string): void {
  const when = nowWIB();
  notifyAdmin(
    `🔓 Login baru\n\nUser: ${username}\nIP: ${ip}\nWaktu: ${when}`,
    adminAlertEmail("Login baru", [
      ["Username", username],
      ["Alamat IP", ip],
      ["Perangkat", device],
      ["Waktu", when],
    ]),
  );
}

export function notifyAdminPasswordChanged(username: string): void {
  const when = nowWIB();
  notifyAdmin(
    `🔑 Password diubah\n\nUser: ${username}\nWaktu: ${when}`,
    adminAlertEmail("Password diubah", [
      ["Username", username],
      ["Waktu", when],
    ]),
  );
}

export function notifyAdminPayment(username: string, planName: string, amountRp: number, orderId: string): void {
  const when = nowWIB();
  const amount = `Rp${amountRp.toLocaleString("id-ID")}`;
  notifyAdmin(
    `💰 Pembayaran berhasil\n\nUser: ${username}\nPaket: ${planName}\nJumlah: ${amount}\nOrder: ${orderId}\nWaktu: ${when}`,
    adminAlertEmail("Pembayaran berhasil", [
      ["Username", username],
      ["Paket", planName],
      ["Jumlah", amount],
      ["Order ID", orderId],
      ["Waktu", when],
    ]),
  );
}
