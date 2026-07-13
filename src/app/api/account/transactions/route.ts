import { NextResponse } from "next/server";
import { getCurrentFullUser } from "@/lib/currentUser";
import { listTransactionsForUser } from "@/lib/transactions";
import { getPlan } from "@/lib/plans";
import { getEffectiveTenantId } from "@/lib/users";

export async function GET() {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "tenant_staff") {
    return NextResponse.json({ error: "Hanya pemilik akun yang bisa melihat riwayat tagihan" }, { status: 403 });
  }

  const tenantId = getEffectiveTenantId(user);
  const transactions = listTransactionsForUser(tenantId).map((t) => ({
    orderId: t.orderId,
    planName: getPlan(t.planId)?.name ?? "Paket tidak diketahui",
    totalAmount: t.totalAmount,
    status: t.status,
    createdAt: t.createdAt,
    paidAt: t.paidAt,
    expiredAt: t.expiredAt,
  }));

  return NextResponse.json(transactions);
}
