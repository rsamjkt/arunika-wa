const API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

/** Fire-and-forget-but-safe: logs failures, never throws into the caller's
 * main flow (registration/payment/etc. must succeed even if email fails). */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${subject}" to ${to}`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[email] send failed (${res.status}) to ${to}: ${text}`);
    }
  } catch (err) {
    console.error(`[email] send error to ${to}:`, err instanceof Error ? err.message : err);
  }
}

const WRAPPER = (title: string, body: string) => `
<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h2 style="color:#0a3d36">${title}</h2>
  ${body}
  <p style="color:#889691;font-size:12px;margin-top:32px">Arunika · WA — WhatsApp Gateway Platform</p>
</div>`;

export function welcomeEmail(username: string, planName: string): { subject: string; html: string } {
  return {
    subject: "Selamat datang di Arunika · WA",
    html: WRAPPER(
      "Akun Anda aktif! 🎉",
      `<p>Halo <b>${username}</b>,</p>
       <p>Akun Arunika-WA Anda sudah aktif dengan paket <b>${planName}</b>. Silakan masuk dan hubungkan perangkat WhatsApp pertama Anda.</p>`,
    ),
  };
}

export function paymentConfirmedEmail(username: string, planName: string): { subject: string; html: string } {
  return {
    subject: "Pembayaran berhasil — paket Anda aktif",
    html: WRAPPER(
      "Pembayaran diterima ✅",
      `<p>Halo <b>${username}</b>,</p>
       <p>Pembayaran Anda berhasil diverifikasi. Paket <b>${planName}</b> sudah aktif di akun Anda.</p>`,
    ),
  };
}

export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Reset password Arunika · WA",
    html: WRAPPER(
      "Reset Password",
      `<p>Kami menerima permintaan reset password untuk akun Anda.</p>
       <p><a href="${resetUrl}" style="background:#25d366;color:#04271f;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">Atur Password Baru</a></p>
       <p style="color:#889691;font-size:13px">Link ini berlaku 1 jam. Jika Anda tidak meminta ini, abaikan email ini.</p>`,
    ),
  };
}

export function subscriptionExpiringEmail(username: string, planName: string, expiresAt: string): { subject: string; html: string } {
  return {
    subject: `Paket ${planName} Anda akan berakhir`,
    html: WRAPPER(
      "Segera perpanjang paket Anda ⏰",
      `<p>Halo <b>${username}</b>,</p>
       <p>Paket <b>${planName}</b> Anda akan berakhir pada <b>${new Date(expiresAt).toLocaleDateString("id-ID")}</b>. Perpanjang sekarang di halaman Paket Saya supaya perangkat dan fitur Anda tidak turun ke paket Free.</p>`,
    ),
  };
}
