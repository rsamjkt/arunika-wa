import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/authz";
import { listTenants, getEffectiveQuotaUsage } from "@/lib/users";
import { getPlan } from "@/lib/plans";
import { countOwnedSessions } from "@/lib/tenancy";

export async function GET() {
  const { response } = await requireSuperadmin();
  if (response) return response;

  const tenants = listTenants().map((t) => ({
    id: t.id,
    username: t.username,
    createdAt: t.createdAt,
    subscriptionStatus: t.subscriptionStatus,
    subscriptionExpiresAt: t.subscriptionExpiresAt,
    plan: getPlan(t.planId),
    usage: {
      messagesSent: getEffectiveQuotaUsage(t.id),
      devices: countOwnedSessions(t.id),
    },
  }));

  return NextResponse.json(tenants);
}
