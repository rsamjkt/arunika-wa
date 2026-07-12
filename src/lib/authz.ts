import { NextResponse } from "next/server";
import { getCurrentFullUser } from "./currentUser";
import { getPlan, hasFeature as planHasFeature, type FeatureKey } from "./plans";
import { getEffectiveQuotaUsage, getGoverningUser, type User } from "./users";

export async function requireSuperadmin(): Promise<{ user: User | null; response: NextResponse | null }> {
  const user = await getCurrentFullUser();
  if (!user || user.role !== "superadmin") {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, response: null };
}

/** True if the user (or their plan) still has room to send this month.
 * Superadmin and unlimited-quota plans always pass. */
export function hasQuotaRemaining(user: User): boolean {
  if (user.role === "superadmin") return true;
  const governing = getGoverningUser(user);
  const plan = getPlan(governing.planId);
  if (!plan || plan.monthlyMessageQuota === null) return true;
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
  const governing = getGoverningUser(user);
  const plan = getPlan(governing.planId);
  if (!plan || !planHasFeature(plan, key)) {
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
