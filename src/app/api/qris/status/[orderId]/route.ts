import { NextResponse } from "next/server";
import { checkStatus, isPaidStatus } from "@/lib/klikqris";
import { activateFromPaidTransaction, getTransaction, markTransactionExpired } from "@/lib/transactions";
import { getCurrentFullUser } from "@/lib/currentUser";
import { getEffectiveTenantId } from "@/lib/users";

export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const tx = getTransaction(orderId);
  if (!tx) {
    return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  }

  // This endpoint must stay reachable without a session — a brand-new
  // registrant has no account/cookie yet while polling their first
  // payment. But once someone IS logged in, never let them poll a
  // transaction that isn't their own (or superadmin's, for support).
  const user = await getCurrentFullUser();
  if (user && user.role !== "superadmin" && getEffectiveTenantId(user) !== tx.userId) {
    return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  }

  // Reconcile against KlikQRIS directly — fallback in case the webhook
  // never arrived, per their documented best practice.
  if (tx.status === "PENDING") {
    try {
      const remote = await checkStatus(orderId);
      if (isPaidStatus(remote.status)) {
        activateFromPaidTransaction(orderId, remote.paid_at ?? undefined);
      } else if (remote.status === "EXPIRED") {
        markTransactionExpired(orderId);
      }
    } catch {
      // KlikQRIS unreachable — fall through and return our last known status
    }
  }

  const fresh = getTransaction(orderId)!;
  return NextResponse.json({
    status: fresh.status,
    totalAmount: fresh.totalAmount,
    qrisImage: fresh.qrisImage,
    expiredAt: fresh.expiredAt,
  });
}
