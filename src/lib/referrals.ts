import crypto from "node:crypto";
import { readJson, writeJson } from "./store";
import { activateSubscription, getFullUser } from "./users";
import { listPlans } from "./plans";
import { referralRewardEmail, sendEmail } from "./email";

export type Referral = {
  id: string;
  referrerId: string;
  referrerUsername: string;
  referredUserId: string;
  referredUsername: string;
  createdAt: string;
};

const FILE = "referrals.json";
const REWARD_DAYS = 7;

function all(): Referral[] {
  return readJson<Referral[]>(FILE, []);
}

export function recordReferral(
  referrerId: string,
  referrerUsername: string,
  referredUserId: string,
  referredUsername: string,
): Referral {
  const record: Referral = {
    id: crypto.randomUUID(),
    referrerId,
    referrerUsername,
    referredUserId,
    referredUsername,
    createdAt: new Date().toISOString(),
  };
  const list = all();
  list.push(record);
  writeJson(FILE, list);
  return record;
}

export function listReferralsFor(referrerId: string): Referral[] {
  return all()
    .filter((r) => r.referrerId === referrerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Cascade delete — used when a tenant account is removed entirely. */
export function deleteReferralsForOwner(ownerId: string): void {
  writeJson(
    FILE,
    all().filter((r) => r.referrerId !== ownerId && r.referredUserId !== ownerId),
  );
}

/** +7 days on the referrer's current plan if they're already paid, or a
 * 7-day taste of the cheapest paid plan if they're on Free — reuses
 * activateSubscription directly, no separate credit/quota system. */
export function applyReferralReward(referrerId: string): void {
  const referrer = getFullUser(referrerId);
  // A tenant mid-checkout (pending_payment) also has subscriptionExpiresAt
  // === null, same as a free-active tenant — don't grant a paid-plan taste
  // to someone who hasn't actually paid yet.
  if (!referrer || referrer.subscriptionStatus !== "active") return;

  let planId = referrer.planId;
  let base = referrer.subscriptionExpiresAt ? new Date(referrer.subscriptionExpiresAt).getTime() : Date.now();

  if (!referrer.subscriptionExpiresAt) {
    const cheapestPaid = listPlans().find((p) => !p.isFree);
    if (!cheapestPaid) return;
    planId = cheapestPaid.id;
    base = Date.now();
  }

  const newExpiry = new Date(base + REWARD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  activateSubscription(referrerId, planId, newExpiry);

  const plan = listPlans().find((p) => p.id === planId);
  if (referrer.email && plan) {
    const { subject, html } = referralRewardEmail(referrer.username, REWARD_DAYS, plan.name);
    sendEmail(referrer.email, subject, html).catch(() => {});
  }
}
