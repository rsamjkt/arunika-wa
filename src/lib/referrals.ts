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
  // Only true once the referred account has actually paid for a plan —
  // recording the referral at signup is free, but the reward itself must
  // wait for real money to avoid unlimited free-plan-time via fake signups.
  rewarded: boolean;
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
    rewarded: false,
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

// Bounds referral-reward arbitrage via sock-puppet accounts: without a
// cap, a referrer can keep registering new accounts, buying the cheapest
// paid plan under each one, and referring their own primary account —
// each cycle stacks +REWARD_DAYS on the primary account regardless of
// how cheap the plan bought under the sock account was (see security
// audit). A generous rolling-window cap still rewards real word-of-mouth
// growth (up to MAX_REWARDS_PER_WINDOW × REWARD_DAYS bonus days per
// window) while bounding the rate of self-arbitrage.
const REWARD_WINDOW_DAYS = 30;
const MAX_REWARDS_PER_WINDOW = 8;

/** Called when a referred account's payment is confirmed (not at signup) —
 * grants the referrer's reward exactly once per referral, no matter how
 * many transactions/upgrades the referred account pays for afterward. */
export function rewardReferralIfPending(referredUserId: string): void {
  const list = all();
  const referral = list.find((r) => r.referredUserId === referredUserId && !r.rewarded);
  if (!referral) return;

  const windowStart = Date.now() - REWARD_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recentRewards = list.filter(
    (r) => r.referrerId === referral.referrerId && r.rewarded && new Date(r.createdAt).getTime() >= windowStart,
  ).length;

  referral.rewarded = true;
  writeJson(FILE, list);
  // Still marks it rewarded (so it can never be paid out twice later) even
  // when the cap blocks the actual bonus — a referral over the cap simply
  // grants no extra days, it doesn't queue up for whenever the window resets.
  if (recentRewards >= MAX_REWARDS_PER_WINDOW) return;
  applyReferralReward(referral.referrerId);
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
