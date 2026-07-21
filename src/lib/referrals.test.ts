import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeFiles = new Map<string, unknown>();
vi.mock("./store", () => ({
  readJson: (file: string, fallback: unknown) => (fakeFiles.has(file) ? fakeFiles.get(file) : fallback),
  writeJson: (file: string, data: unknown) => {
    fakeFiles.set(file, data);
  },
}));

const activateSubscription = vi.fn();
vi.mock("./users", () => ({
  activateSubscription: (...args: unknown[]) => activateSubscription(...args),
  getFullUser: (id: string) =>
    id === "referrer-1"
      ? { id: "referrer-1", username: "ref1", email: "ref1@test.local", planId: "plan-free", subscriptionStatus: "active", subscriptionExpiresAt: null }
      : null,
}));

vi.mock("./plans", () => ({
  listPlans: () => [
    { id: "plan-free", isFree: true, name: "Free" },
    { id: "plan-cheap", isFree: false, name: "Cheap", priceRp: 19000 },
  ],
}));

vi.mock("./email", () => ({
  referralRewardEmail: () => ({ subject: "x", html: "x" }),
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { recordReferral, rewardReferralIfPending } from "./referrals";

beforeEach(() => {
  fakeFiles.clear();
  activateSubscription.mockClear();
});

describe("rewardReferralIfPending", () => {
  it("grants the reward exactly once for a pending referral", () => {
    const ref = recordReferral("referrer-1", "ref1", "referred-1", "new1");
    expect(ref.rewarded).toBe(false);

    rewardReferralIfPending("referred-1");
    expect(activateSubscription).toHaveBeenCalledTimes(1);
    expect(activateSubscription).toHaveBeenCalledWith("referrer-1", "plan-cheap", expect.any(String));
  });

  it("never rewards the same referral twice, even if called again", () => {
    recordReferral("referrer-1", "ref1", "referred-2", "new2");
    rewardReferralIfPending("referred-2");
    rewardReferralIfPending("referred-2"); // second call — referral is already marked rewarded
    expect(activateSubscription).toHaveBeenCalledTimes(1);
  });

  it("is a no-op for a referredUserId with no matching referral", () => {
    rewardReferralIfPending("nobody-referred-this-user");
    expect(activateSubscription).not.toHaveBeenCalled();
  });

  it("caps rewards at MAX_REWARDS_PER_WINDOW (8) within the rolling window", () => {
    // Regression test for the sock-puppet referral-stacking finding from
    // the security audit — a referrer must not be able to extend their
    // plan indefinitely by cycling disposable referred accounts.
    for (let i = 0; i < 8; i++) {
      recordReferral("referrer-1", "ref1", `referred-batch-${i}`, `nameBatch${i}`);
      rewardReferralIfPending(`referred-batch-${i}`);
    }
    expect(activateSubscription).toHaveBeenCalledTimes(8);

    // The 9th referral within the same window is marked rewarded (so it
    // can never be double-paid later) but must NOT trigger another grant.
    recordReferral("referrer-1", "ref1", "referred-9th", "name9");
    rewardReferralIfPending("referred-9th");
    expect(activateSubscription).toHaveBeenCalledTimes(8);
  });
});
