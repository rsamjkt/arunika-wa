import { describe, expect, it } from "vitest";
import { safeCalc } from "./calc";

describe("safeCalc", () => {
  it("aritmetika dasar", () => {
    expect(safeCalc("150000*3")).toBe(450000);
    expect(safeCalc("100000 * 0.8")).toBe(80000);
    expect(safeCalc("(50000+25000)*2")).toBe(150000);
  });
  it("tolak input non-aritmetika (anti-injeksi)", () => {
    expect(safeCalc("process.exit(1)")).toBeNull();
    expect(safeCalc("alert('x')")).toBeNull();
    expect(safeCalc("1+1; console.log(1)")).toBeNull();
    expect(safeCalc("")).toBeNull();
  });
  it("tolak hasil tak hingga / invalid", () => {
    expect(safeCalc("1/0")).toBeNull();
  });
});
