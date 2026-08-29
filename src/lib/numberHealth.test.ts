import { describe, expect, it } from "vitest";
import { computeHealth } from "./numberHealth";

describe("computeHealth", () => {
  it("nomor sehat: kirim wajar + ada balasan", () => {
    const h = computeHealth(30, 0, 12);
    expect(h.score).toBe(100);
    expect(h.label).toBe("baik");
  });
  it("gagal kirim tinggi menurunkan skor", () => {
    const h = computeHealth(5, 15, 2); // failRate 0.75
    expect(h.score).toBeLessThan(60);
    expect(["waspada", "berisiko"]).toContain(h.label);
  });
  it("blast besar tanpa balasan = berisiko", () => {
    const h = computeHealth(200, 0, 1); // replyRatio 0.005
    expect(h.score).toBe(70); // 100 - 30
    expect(h.label).toBe("baik"); // 70 tepat di ambang baik
  });
  it("banyak gagal + blast tanpa balasan = berisiko", () => {
    const h = computeHealth(60, 120, 0); // failRate 0.667 + replyRatio 0
    expect(h.score).toBeLessThan(40);
    expect(h.label).toBe("berisiko");
  });
  it("tanpa aktivitas = skor penuh (tak ada sinyal buruk)", () => {
    expect(computeHealth(0, 0, 0).score).toBe(100);
  });
});
