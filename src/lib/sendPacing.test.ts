import { describe, expect, it } from "vitest";
import { humanDelayMs, warmupDailyCap, shouldAbortForFailures, PACING } from "./sendPacing";

describe("humanDelayMs", () => {
  it("jeda normal berada dalam rentang dasar", () => {
    expect(humanDelayMs(1, () => 0)).toBe(PACING.BASE_MIN_MS);
    expect(humanDelayMs(1, () => 1)).toBe(PACING.BASE_MAX_MS);
    const mid = humanDelayMs(3, () => 0.5);
    expect(mid).toBeGreaterThanOrEqual(PACING.BASE_MIN_MS);
    expect(mid).toBeLessThanOrEqual(PACING.BASE_MAX_MS);
  });

  it("menyisipkan micro-break yang jauh lebih panjang tiap N pesan", () => {
    const brk = humanDelayMs(PACING.MICRO_BREAK_EVERY, () => 0);
    expect(brk).toBeGreaterThan(PACING.BASE_MAX_MS);
  });

  it("pesan pertama (sentCount 0) bukan micro-break", () => {
    expect(humanDelayMs(0, () => 0)).toBe(PACING.BASE_MIN_MS);
  });
});

describe("warmupDailyCap", () => {
  it("nomor baru dibatasi kecil lalu naik bertahap", () => {
    expect(warmupDailyCap(0)).toBe(50);
    expect(warmupDailyCap(1)).toBe(100);
    expect(warmupDailyCap(0)).toBeLessThan(warmupDailyCap(3));
  });
  it("nomor lama mencapai batas maksimum", () => {
    expect(warmupDailyCap(30)).toBe(PACING.WARMUP_MAX);
  });
  it("umur negatif/aneh diperlakukan sebagai hari ke-0", () => {
    expect(warmupDailyCap(-5)).toBe(50);
    expect(warmupDailyCap(NaN)).toBe(50);
  });
});

describe("shouldAbortForFailures", () => {
  it("tidak abort di bawah ambang", () => {
    expect(shouldAbortForFailures(0)).toBe(false);
    expect(shouldAbortForFailures(PACING.MAX_CONSECUTIVE_FAILURES - 1)).toBe(false);
  });
  it("abort saat mencapai ambang gagal beruntun", () => {
    expect(shouldAbortForFailures(PACING.MAX_CONSECUTIVE_FAILURES)).toBe(true);
  });
});
