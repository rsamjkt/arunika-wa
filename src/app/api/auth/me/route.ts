import { NextResponse } from "next/server";
import { getCurrentFullUser } from "@/lib/currentUser";
import { getPlan } from "@/lib/plans";
import { getEffectiveQuotaUsage, getEffectiveTenantId, getGoverningUser } from "@/lib/users";
import { countOwnedSessions } from "@/lib/tenancy";

export async function GET() {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const governing = getGoverningUser(user);
  const tenantId = getEffectiveTenantId(user);
  const plan = getPlan(governing.planId);
  return NextResponse.json({
    id: user.id,
    username: user.username,
    role: user.role,
    isOwner: user.role !== "tenant_staff",
    subscriptionStatus: governing.subscriptionStatus,
    subscriptionExpiresAt: governing.subscriptionExpiresAt,
    plan,
    usage: {
      messagesSent: getEffectiveQuotaUsage(tenantId),
      devices: countOwnedSessions(tenantId),
    },
  });
}
