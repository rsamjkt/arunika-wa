import { NextResponse } from "next/server";
import { getCurrentFullUser } from "./currentUser";
import { getFreePlan, getPlan, hasFeature as planHasFeature, type FeatureKey, type Plan } from "./plans";
import { getEffectiveQuotaUsage, getGoverningUser, type User } from "./users";

export async function requireSuperadmin(): Promise<{ user: User | null; response: NextResponse | null }> {
  const user = await getCurrentFullUser();
  if (!user || user.role !== "superadmin") {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, response: null };
}

/** The plan whose limits/features actually apply right now. A tenant's
 * `planId` is set to the paid plan the moment they pick it (before the QRIS
 * invoice is paid), so it must never be trusted on its own — only a
 * subscriptionStatus of "active" means the paid plan was actually paid for. */
export function getEffectivePlan(user: User): Plan {
  const governing = getGoverningUser(user);
  if (governing.subscriptionStatus !== "active") return getFreePlan();
  return getPlan(governing.planId) ?? getFreePlan();
}

/** True if the user (or their plan) still has room to send this month.
 * Superadmin and unlimited-quota plans always pass. */
export function hasQuotaRemaining(user: User): boolean {
  if (user.role === "superadmin") return true;
  const governing = getGoverningUser(user);
  const plan = getEffectivePlan(user);
  if (plan.monthlyMessageQuota === null) return true;
  return getEffectiveQuotaUsage(governing.id) < plan.monthlyMessageQuota;
}

export function quotaExceededResponse(): NextResponse {
  return NextResponse.json(
    { error: "Kuota pesan bulanan paket Anda sudah habis. Silakan upgrade paket." },
    { status: 429 },
  );
}

export async function requireFeature(
  key: FeatureKey,
): Promise<{ user: User | null; response: NextResponse | null }> {
  const user = await getCurrentFullUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (user.role === "superadmin") {
    return { user, response: null };
  }
  const plan = getEffectivePlan(user);
  if (!planHasFeature(plan, key)) {
    return {
      user,
      response: NextResponse.json(
        { error: "Paket Anda tidak termasuk fitur ini. Silakan upgrade paket." },
        { status: 403 },
      ),
    };
  }
  return { user, response: null };
}
