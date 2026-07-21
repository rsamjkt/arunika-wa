import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory fake for store.ts's readJson/writeJson, scoped per test file —
// avoids plans.test.ts ever touching the real data/plans.json on disk.
const fakeFiles = new Map<string, unknown>();
vi.mock("./store", () => ({
  readJson: (file: string, fallback: unknown) => (fakeFiles.has(file) ? fakeFiles.get(file) : fallback),
  writeJson: (file: string, data: unknown) => {
    fakeFiles.set(file, data);
  },
}));

import { createPlan, updatePlan, getPlan } from "./plans";

beforeEach(() => {
  fakeFiles.clear();
});

describe("createPlan", () => {
  it("derives isFree=true when priceRp is 0", () => {
    const plan = createPlan({
      name: "Test Free",
      priceRp: 0,
      durationDays: null,
      deviceLimit: 1,
      monthlyMessageQuota: 100,
      features: [],
    });
    expect(plan.isFree).toBe(true);
  });

  it("derives isFree=false when priceRp is positive", () => {
    const plan = createPlan({
      name: "Test Paid",
      priceRp: 19000,
      durationDays: 30,
      deviceLimit: 1,
      monthlyMessageQuota: 5000,
      features: [],
    });
    expect(plan.isFree).toBe(false);
  });
});

describe("updatePlan", () => {
  it("re-derives isFree=false when a free plan is repriced to a positive amount", () => {
    // Regression test for the exact bug found in the security audit: a
    // plan created as Free (priceRp: 0, isFree: true) that later gets its
    // price bumped via PATCH must stop being treated as free everywhere
    // (register/upgrade both branch on plan.isFree to skip payment
    // entirely) — otherwise it silently grants paid access for Rp0.
    const plan = createPlan({
      name: "Promo",
      priceRp: 0,
      durationDays: null,
      deviceLimit: 1,
      monthlyMessageQuota: 100,
      features: [],
    });
    expect(plan.isFree).toBe(true);

    updatePlan(plan.id, { priceRp: 49000 });

    const updated = getPlan(plan.id);
    expect(updated?.priceRp).toBe(49000);
    expect(updated?.isFree).toBe(false);
  });

  it("re-derives isFree=true when a paid plan is repriced down to 0", () => {
    const plan = createPlan({
      name: "Discontinued",
      priceRp: 19000,
      durationDays: 30,
      deviceLimit: 1,
      monthlyMessageQuota: 5000,
      features: [],
    });
    expect(plan.isFree).toBe(false);

    updatePlan(plan.id, { priceRp: 0 });

    expect(getPlan(plan.id)?.isFree).toBe(true);
  });

  it("does not change isFree when priceRp is left untouched by the patch", () => {
    const plan = createPlan({
      name: "Stable",
      priceRp: 99000,
      durationDays: 30,
      deviceLimit: 5,
      monthlyMessageQuota: 60000,
      features: ["broadcast"],
    });
    updatePlan(plan.id, { name: "Stable Renamed" });
    const updated = getPlan(plan.id);
    expect(updated?.isFree).toBe(false);
    expect(updated?.priceRp).toBe(99000);
    expect(updated?.name).toBe("Stable Renamed");
  });
});
