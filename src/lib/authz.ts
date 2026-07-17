import { NextResponse } from "next/server";
import { getCurrentFullUser } from "./currentUser";
import { getFreePlan, getPlan, hasFeature as planHasFeature, type FeatureKey, type Plan } from "./plans";
import { getEffectiveQuotaUsage, getGoverningUser, reserveQuotaUsage, decrementQuotaUsage, type User } from "./users";
import { createNotification, hasRecentNotification } from "./notifications";

const QUOTA_WARNING_THRESHOLD = 0.8;

function maybeNotifyQuotaNearLimit(userId: string, usage: number, limit: number) {
  if (limit <= 0 || usage / limit < QUOTA_WARNING_THRESHOLD) return;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  if (hasRecentNotification(userId, "quota_near_limit", startOfMonth)) return;
  createNotification(
    userId,
    "quota_near_limit",
    "Kuota pesan bulanan hampir habis",
    `Sudah terpakai ${usage} dari ${limit} pesan bulan ini (${Math.round((usage / limit) * 100)}%). Upgrade paket agar pengiriman tidak terhenti.`,
    "/account/plan",
  );
}

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
  const usage = getEffectiveQuotaUsage(governing.id);
  maybeNotifyQuotaNearLimit(governing.id, usage, plan.monthlyMessageQuota);
  return usage < plan.monthlyMessageQuota;
}

/** Atomically reserves one unit of message quota for `user`, or returns
 * false and reserves nothing if they're already at their monthly limit.
 * Use this instead of hasQuotaRemaining() for anything that actually sends
 * a message — checking then incrementing only after a full network
 * round-trip (the previous pattern in every send-* route) leaves a race
 * window where a burst of concurrent requests can all pass the check
 * before any of them increment, sending well past the quota. Call
 * refundQuota() if the send this reserved for ultimately fails, so a
 * failed send doesn't count against the tenant. */
export function reserveQuota(user: User): boolean {
  if (user.role === "superadmin") return true;
  const governing = getGoverningUser(user);
  const plan = getEffectivePlan(user);
  if (plan.monthlyMessageQuota === null) return true;
  const reserved = reserveQuotaUsage(governing.id, plan.monthlyMessageQuota);
  if (reserved) {
    maybeNotifyQuotaNearLimit(governing.id, getEffectiveQuotaUsage(governing.id), plan.monthlyMessageQuota);
  }
  return reserved;
}

export function refundQuota(user: User): void {
  decrementQuotaUsage(getGoverningUser(user).id);
}

export function quotaExceededResponse(): NextResponse {
  return NextResponse.json(
    { error: "Kuota pesan bulanan paket Anda sudah habis. Silakan upgrade paket." },
    { status: 429 },
  );
}

/** Request-independent feature check — for places that already have a
 * `User` record (e.g. resolved from an ownerId in a webhook handler) but
 * have no HTTP request/session to pull one from via getCurrentFullUser(). */
export function userHasFeature(user: User, key: FeatureKey): boolean {
  if (user.role === "superadmin") return true;
  return planHasFeature(getEffectivePlan(user), key);
}

export async function requireFeature(
  key: FeatureKey,
): Promise<{ user: User | null; response: NextResponse | null }> {
  const user = await getCurrentFullUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!userHasFeature(user, key)) {
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
