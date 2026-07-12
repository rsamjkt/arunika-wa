import { NextResponse } from "next/server";
import { getCurrentFullUser } from "@/lib/currentUser";
import { getEffectivePlan } from "@/lib/authz";
import { getEffectiveQuotaUsage, getEffectiveTenantId, getGoverningUser } from "@/lib/users";
import { countOwnedSessions } from "@/lib/tenancy";
import { listTransactionsForUser } from "@/lib/transactions";

export async function GET() {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const governing = getGoverningUser(user);
  const tenantId = getEffectiveTenantId(user);
  const plan = getEffectivePlan(user);
  const pendingTx = listTransactionsForUser(governing.id).find((t) => t.status === "PENDING");
  return NextResponse.json({
    id: user.id,
    username: user.username,
    role: user.role,
    isOwner: user.role !== "tenant_staff",
    subscriptionStatus: governing.subscriptionStatus,
    subscriptionExpiresAt: governing.subscriptionExpiresAt,
    plan,
    pendingOrderId: pendingTx?.orderId ?? null,
    usage: {
      messagesSent: getEffectiveQuotaUsage(tenantId),
      devices: countOwnedSessions(tenantId),
    },
  });
}
