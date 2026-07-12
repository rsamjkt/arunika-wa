import { sendText } from "./waha";

const SESSION = process.env.ADMIN_NOTIFY_SESSION ?? "";

/** Sends the QRIS invoice/payment-link straight to the customer's own
 * WhatsApp number, from the platform's own connected session — a
 * brand-new or still-unpaid tenant has no WA session of their own
 * connected yet. Best-effort, fire-and-forget: must never block or fail
 * the registration/upgrade flow it's called from. */
export function sendInvoiceWhatsApp(
  phone: string,
  username: string,
  planName: string,
  orderId: string,
  totalAmount: number,
  payUrl: string,
  expiredAt: string,
): void {
  if (!SESSION) return;
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 8) return;

  const text =
    `Halo ${username}, berikut invoice Arunika · WA Anda.\n\n` +
    `No. Invoice: ${orderId}\n` +
    `Paket: ${planName}\n` +
    `Total: Rp${totalAmount.toLocaleString("id-ID")}\n` +
    `Metode: QRIS\n` +
    `Kedaluwarsa: ${new Date(expiredAt).toLocaleString("id-ID")}\n\n` +
    `Bayar di sini: ${payUrl}\n\n` +
    `Status akan otomatis terupdate begitu pembayaran diterima, tidak perlu konfirmasi manual.`;

  sendText(SESSION, `${digits}@c.us`, text).catch((err) => {
    console.error("[customerNotify] WA invoice send failed:", err instanceof Error ? err.message : err);
  });
}
