import crypto from "node:crypto";
import nodemailer from "nodemailer";

export type EmailAttachment = { filename: string; content: Buffer; cid: string; contentType?: string };

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? "587");
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const FROM = process.env.EMAIL_FROM || SMTP_USER;

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

/** Fire-and-forget-but-safe: logs failures, never throws into the caller's
 * main flow (registration/payment/etc. must succeed even if email fails). */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[],
): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.warn(`[email] SMTP not configured — skipped "${subject}" to ${to}`);
    return;
  }
  try {
    await t.sendMail({ from: FROM, to, subject, html, attachments });
  } catch (err) {
    console.error(`[email] send error to ${to}:`, err instanceof Error ? err.message : err);
  }
}

/** Converts a "data:image/png;base64,...." string (as returned by
 * KlikQRIS) into a CID attachment + matching <img src="cid:..."> tag.
 * Gmail and most webmail clients strip inline data: URIs from received
 * emails for security — a CID-referenced attachment is the one embedding
 * method that actually renders across clients. Returns an empty tag/no
 * attachment if the string isn't a data URI (defensive, shouldn't happen). */
function embedInlineImage(dataUri: string): { tag: string; attachment: EmailAttachment | null } {
  const match = dataUri.match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (!match) return { tag: "", attachment: null };
  const [, contentType, base64Data] = match;
  const cid = `img-${crypto.randomBytes(8).toString("hex")}`;
  return {
    tag: `<div style="text-align:center;margin:20px 0;"><img src="cid:${cid}" alt="QRIS" width="220" height="220" style="border:1px solid #e6ece9;border-radius:10px;"></div>`,
    attachment: { filename: "qris.png", content: Buffer.from(base64Data, "base64"), cid, contentType },
  };
}

const WRAPPER = (title: string, body: string) => `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#eef3f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(10,61,54,0.08);">
            <tr>
              <td style="background:#0a3d36;padding:26px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#f97316;width:36px;height:36px;border-radius:9px;text-align:center;vertical-align:middle;font-weight:800;font-size:16px;color:#ffffff;line-height:36px;">A</td>
                    <td style="padding-left:11px;color:#ffffff;font-weight:800;font-size:17px;vertical-align:middle;">Arunika&nbsp;·&nbsp;WA</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 32px 8px;">
                <h1 style="margin:0 0 18px;color:#0a3d36;font-size:20px;font-weight:800;">${title}</h1>
                <div style="color:#3a4a45;font-size:14.5px;line-height:1.65;">${body}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 32px 28px;">
                <div style="height:1px;background:#e6ece9;margin-bottom:20px;"></div>
                <p style="margin:0;color:#8a9a94;font-size:12px;line-height:1.6;">
                  Arunika · WA — WhatsApp Gateway Platform<br>
                  Email ini dikirim otomatis, mohon tidak dibalas.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const BUTTON = (href: string, label: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
  <tr>
    <td style="background:#25d366;border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:12px 22px;color:#04271f;font-weight:700;font-size:14px;text-decoration:none;">${label}</a>
    </td>
  </tr>
</table>`;

const INVOICE_TABLE = (rows: [string, string][]) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e6ece9;border-radius:10px;overflow:hidden;">
  ${rows
    .map(
      ([label, value], i) => `
  <tr>
    <td style="padding:10px 14px;font-size:13px;color:#8a9a94;background:${i % 2 === 0 ? "#f7faf8" : "#ffffff"};">${label}</td>
    <td style="padding:10px 14px;font-size:13px;color:#0a3d36;font-weight:700;text-align:right;background:${i % 2 === 0 ? "#f7faf8" : "#ffffff"};">${value}</td>
  </tr>`,
    )
    .join("")}
</table>`;

const RP = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export function welcomeEmail(username: string, planName: string): { subject: string; html: string } {
  return {
    subject: "Selamat datang di Arunika · WA",
    html: WRAPPER(
      "Akun Anda Aktif",
      `<p>Halo <b>${username}</b>,</p>
       <p>Akun Arunika-WA Anda sudah aktif dengan paket <b>${planName}</b>. Silakan masuk dan hubungkan perangkat WhatsApp pertama Anda.</p>`,
    ),
  };
}

/** Sent when a QRIS transaction is created — includes the QR code inline so
 * the tenant can pay straight from their inbox even if they lose the tab. */
export function invoicePendingEmail(
  username: string,
  planName: string,
  orderId: string,
  totalAmount: number,
  qrisImage: string,
  expiredAt: string,
  payUrl: string,
): { subject: string; html: string; attachments: EmailAttachment[] } {
  const { tag: qrTag, attachment } = qrisImage ? embedInlineImage(qrisImage) : { tag: "", attachment: null };
  return {
    subject: `Invoice ${orderId} — selesaikan pembayaran paket ${planName}`,
    html: WRAPPER(
      "Selesaikan Pembayaran",
      `<p>Halo <b>${username}</b>,</p>
       <p>Berikut invoice untuk paket <b>${planName}</b>. Scan QRIS di bawah dengan aplikasi e-wallet/mobile banking Anda — bayar tepat sesuai nominal (termasuk kode unik) supaya otomatis terverifikasi.</p>
       ${INVOICE_TABLE([
         ["No. Invoice", orderId],
         ["Paket", planName],
         ["Metode Pembayaran", "QRIS"],
         ["Total Bayar", RP(totalAmount)],
         ["Kedaluwarsa", new Date(expiredAt).toLocaleString("id-ID")],
       ])}
       ${qrTag}
       ${BUTTON(payUrl, "Buka Halaman Pembayaran")}
       <p style="color:#8a9a94;font-size:13px">Sudah bayar? Status akan otomatis terupdate dalam beberapa detik, tidak perlu konfirmasi manual.</p>`,
    ),
    attachments: attachment ? [attachment] : [],
  };
}

export function paymentConfirmedEmail(
  username: string,
  planName: string,
  orderId: string,
  totalAmount: number,
  paidAt: string,
): { subject: string; html: string } {
  return {
    subject: `Invoice ${orderId} — pembayaran berhasil, paket Anda aktif`,
    html: WRAPPER(
      "Pembayaran Diterima",
      `<p>Halo <b>${username}</b>,</p>
       <p>Pembayaran Anda berhasil diverifikasi. Paket <b>${planName}</b> sudah aktif di akun Anda.</p>
       ${INVOICE_TABLE([
         ["No. Invoice", orderId],
         ["Paket", planName],
         ["Metode Pembayaran", "QRIS"],
         ["Total Dibayar", RP(totalAmount)],
         ["Dibayar pada", new Date(paidAt).toLocaleString("id-ID")],
         ["Status", "LUNAS"],
       ])}
       <p style="color:#8a9a94;font-size:13px">Simpan email ini sebagai bukti pembayaran Anda.</p>`,
    ),
  };
}

export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Reset password Arunika · WA",
    html: WRAPPER(
      "Reset Password",
      `<p>Kami menerima permintaan reset password untuk akun Anda.</p>
       ${BUTTON(resetUrl, "Atur Password Baru")}
       <p style="color:#8a9a94;font-size:13px">Link ini berlaku 1 jam. Jika Anda tidak meminta ini, abaikan email ini.</p>`,
    ),
  };
}

/** Internal — notifies the platform admin whenever any tenant requests a
 * password reset, so it can be monitored (not sent to the tenant). */
export function adminPasswordResetNotifyEmail(username: string, userEmail: string): { subject: string; html: string } {
  const when = new Date().toLocaleString("id-ID");
  return {
    subject: `[Admin] Permintaan reset password — ${username}`,
    html: WRAPPER(
      "Permintaan Reset Password",
      `<p>Ada permintaan reset password di platform.</p>
       ${INVOICE_TABLE([
         ["Username", username],
         ["Email", userEmail],
         ["Waktu", when],
       ])}`,
    ),
  };
}

export function referralRewardEmail(username: string, days: number, planName: string): { subject: string; html: string } {
  return {
    subject: `Bonus ${days} hari karena mengajak teman`,
    html: WRAPPER(
      "Terima Kasih Sudah Mengajak Teman",
      `<p>Halo <b>${username}</b>,</p>
       <p>Ada yang baru saja mendaftar Arunika-WA pakai kode referral Anda. Sebagai terima kasih, kami tambahkan
       <b>${days} hari</b> masa aktif paket <b>${planName}</b> ke akun Anda — otomatis, tanpa perlu klaim.</p>
       <p style="color:#8a9a94;font-size:13px">Terus ajak teman lain dan kumpulkan lebih banyak bonus hari aktif. Cek halaman Program Referral untuk lihat kode dan riwayat Anda.</p>`,
    ),
  };
}

export function subscriptionExpiringEmail(username: string, planName: string, expiresAt: string): { subject: string; html: string } {
  return {
    subject: `Paket ${planName} Anda akan berakhir`,
    html: WRAPPER(
      "Segera Perpanjang Paket Anda",
      `<p>Halo <b>${username}</b>,</p>
       <p>Paket <b>${planName}</b> Anda akan berakhir pada <b>${new Date(expiresAt).toLocaleDateString("id-ID")}</b>. Perpanjang sekarang di halaman Paket Saya supaya perangkat dan fitur Anda tidak turun ke paket Free.</p>`,
    ),
  };
}

/** Cold-outreach offer sent to a business/school/hospital lead — not tied
 * to any tenant account. Keep it short and always include an opt-out path. */
export function leadOfferEmail(leadName: string, helpUrl: string): { subject: string; html: string } {
  return {
    subject: `${leadName} — WhatsApp Gateway untuk bisnis Anda`,
    html: WRAPPER(
      "Kelola WhatsApp Bisnis Anda Lebih Rapi",
      `<p>Halo Tim <b>${leadName}</b>,</p>
       <p>Kami dari Arunika · WA — platform WhatsApp Gateway untuk kirim pesan, broadcast, auto-reply,
       dan integrasi API ke sistem Anda sendiri, dengan staf/tim tak terbatas di setiap paket.</p>
       <p>Mulai dari <b>Rp0/bulan</b> (paket gratis tersedia), paket berbayar dibayar mudah lewat QRIS.</p>
       ${BUTTON(helpUrl, "Lihat Info Lengkap")}
       <p style="color:#8a9a94;font-size:12px">Email ini adalah penawaran satu kali. Balas email ini dengan kata "STOP" bila tidak ingin menerima info dari kami lagi.</p>`,
    ),
  };
}
