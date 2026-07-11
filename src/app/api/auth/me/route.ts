import { NextResponse } from "next/server";
import { getCurrentFullUser } from "@/lib/currentUser";
import { getPlan } from "@/lib/plans";
import { getEffectiveQuotaUsage } from "@/lib/users";
import { countOwnedSessions } from "@/lib/tenancy";

export async function GET() {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = getPlan(user.planId);
  return NextResponse.json({
    id: user.id,
    username: user.username,
    role: user.role,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
    plan,
    usage: {
      messagesSent: getEffectiveQuotaUsage(user.id),
      devices: countOwnedSessions(user.id),
    },
  });
}
