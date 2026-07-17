import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createTenant, deleteUser, findUserByReferralCode } from "@/lib/users";
import { getPlan } from "@/lib/plans";
import { createTransaction, KlikQrisError } from "@/lib/klikqris";
import { createTransactionRecord } from "@/lib/transactions";
import { invoicePendingEmail, sendEmail, welcomeEmail } from "@/lib/email";
import { recordReferral } from "@/lib/referrals";
import { getAppUrl } from "@/lib/appUrl";
import { sendInvoiceWhatsApp } from "@/lib/customerNotify";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { checkAndCountRequest, clientIp } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Usernames get rendered into HTML emails (see email.ts's escapeHtml, the
// primary defense) — restricting the charset here too is defense in depth
// and keeps usernames sane as login identifiers regardless.
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;

export async function POST(req: NextRequest) {
  // Unthrottled, this endpoint is scriptable account-creation that also
  // triggers a real external payment-gateway call for paid plans (createTransaction)
  // and sends real emails — cap it per IP.
  if (!checkAndCountRequest(`register:${clientIp(req.headers)}`, 8, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Terlalu banyak percobaan pendaftaran. Coba lagi nanti." }, { status: 429 });
  }

  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { username, password, email, phone, planId, referralCode } = body!;

  if (!username || typeof username !== "string" || !USERNAME_RE.test(username.trim())) {
    return NextResponse.json(
      { error: "Username 3-30 karakter, hanya huruf, angka, titik, garis bawah, atau strip" },
      { status: 400 },
    );
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
  }
  const plan = typeof planId === "string" ? getPlan(planId) : null;
  if (!plan) {
    return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 400 });
  }

  let tenant;
  try {
    tenant = createTenant(
      username.trim(),
      password,
      email.trim(),
      typeof phone === "string" && phone.trim() ? phone.trim() : null,
      plan.id,
      plan.isFree ? "active" : "pending_payment",
    );
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal mendaftar" }, { status: 409 });
  }

  // Never block registration on a bad/missing referral code — best-effort only.
  // The relationship is recorded now, but the reward itself only fires once
  // this account's payment is actually confirmed (see rewardReferralIfPending
  // in transactions.ts) — a Free-plan or never-paid signup earns nothing,
  // closing off unlimited free-plan-time via scripted fake registrations.
  if (typeof referralCode === "string" && referralCode.trim()) {
    const referrer = findUserByReferralCode(referralCode);
    if (referrer && referrer.id !== tenant.id) {
      recordReferral(referrer.id, referrer.username, tenant.id, tenant.username);
    }
  }

  if (plan.isFree) {
    const { subject, html } = welcomeEmail(tenant.username, plan.name);
    sendEmail(email.trim(), subject, html).catch(() => {});
    return NextResponse.json({ ok: true, requiresPayment: false });
  }

  const orderId = `REG-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  try {
    const tx = await createTransaction(orderId, plan.priceRp, `Registrasi paket ${plan.name} - Arunika-WA`);
    createTransactionRecord({
      orderId: tx.order_id,
      userId: tenant.id,
      planId: plan.id,
      amount: Number(tx.amount),
      totalAmount: Number(tx.total_amount),
      signature: tx.signature,
      qrisImage: tx.qris_image ?? "",
      expiredAt: tx.expired_at,
      createdAt: tx.created_at,
    });

    const { subject, html, attachments } = invoicePendingEmail(
      tenant.username,
      plan.name,
      tx.order_id,
      Number(tx.total_amount),
      tx.qris_image ?? "",
      tx.expired_at,
      `${getAppUrl()}/register/pay/${tx.order_id}`,
    );
    sendEmail(email.trim(), subject, html, attachments).catch(() => {});
    if (tenant.phone) {
      sendInvoiceWhatsApp(
        tenant.phone,
        tenant.username,
        plan.name,
        tx.order_id,
        Number(tx.total_amount),
        `${getAppUrl()}/register/pay/${tx.order_id}`,
        tx.expired_at,
      );
    }

    return NextResponse.json({
      ok: true,
      requiresPayment: true,
      orderId: tx.order_id,
      totalAmount: tx.total_amount,
      qrisImage: tx.qris_image,
      expiredAt: tx.expired_at,
    });
  } catch (err) {
    deleteUser(tenant.id);
    const status = err instanceof KlikQrisError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat transaksi pembayaran" },
      { status: status || 500 },
    );
  }
}
