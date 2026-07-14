import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentFullUser } from "@/lib/currentUser";
import { getPlan } from "@/lib/plans";
import { activateSubscription } from "@/lib/users";
import { createTransaction, KlikQrisError } from "@/lib/klikqris";
import { createTransactionRecord } from "@/lib/transactions";
import { invoicePendingEmail, sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import { sendInvoiceWhatsApp } from "@/lib/customerNotify";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function POST(req: NextRequest) {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "tenant_staff") {
    return NextResponse.json({ error: "Hanya pemilik akun yang bisa mengubah paket" }, { status: 403 });
  }

  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { planId } = body!;
  const plan = typeof planId === "string" ? getPlan(planId) : null;
  if (!plan) return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 400 });

  if (plan.isFree) {
    activateSubscription(user.id, plan.id, null);
    return NextResponse.json({ ok: true, requiresPayment: false });
  }

  const orderId = `UPG-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  try {
    const tx = await createTransaction(orderId, plan.priceRp, `Upgrade ke paket ${plan.name} - Arunika-WA`);
    createTransactionRecord({
      orderId: tx.order_id,
      userId: user.id,
      planId: plan.id,
      amount: Number(tx.amount),
      totalAmount: Number(tx.total_amount),
      signature: tx.signature,
      qrisImage: tx.qris_image ?? "",
      expiredAt: tx.expired_at,
      createdAt: tx.created_at,
    });

    if (user.email) {
      const { subject, html, attachments } = invoicePendingEmail(
        user.username,
        plan.name,
        tx.order_id,
        Number(tx.total_amount),
        tx.qris_image ?? "",
        tx.expired_at,
        `${getAppUrl()}/register/pay/${tx.order_id}`,
      );
      sendEmail(user.email, subject, html, attachments).catch(() => {});
    }
    if (user.phone) {
      sendInvoiceWhatsApp(
        user.phone,
        user.username,
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
    const status = err instanceof KlikQrisError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat transaksi pembayaran" },
      { status: status || 500 },
    );
  }
}
