import { describe, expect, it } from "vitest";
import { needsHumanHandoff } from "./handoff";

describe("needsHumanHandoff", () => {
  it("minta bicara dengan manusia/CS", () => {
    expect(needsHumanHandoff("mau bicara sama cs dong")).toBe(true);
    expect(needsHumanHandoff("bisa hubungkan ke admin manusia?")).toBe(true);
    expect(needsHumanHandoff("sambungkan ke tim ya")).toBe(true);
    expect(needsHumanHandoff("manusia aja dong")).toBe(true);
  });
  it("tolak bot", () => {
    expect(needsHumanHandoff("jangan dijawab bot")).toBe(true);
  });
  it("komplain serius", () => {
    expect(needsHumanHandoff("saya mau komplain barang rusak")).toBe(true);
    expect(needsHumanHandoff("ini penipuan! minta refund")).toBe(true);
    expect(needsHumanHandoff("kecewa banget sama pelayanannya")).toBe(true);
  });
  it("pertanyaan biasa TIDAK escalate", () => {
    expect(needsHumanHandoff("berapa harga kuenya?")).toBe(false);
    expect(needsHumanHandoff("jam buka toko sampai jam berapa?")).toBe(false);
    expect(needsHumanHandoff("halo kak")).toBe(false);
  });
  it("kosong/pendek false", () => {
    expect(needsHumanHandoff("")).toBe(false);
    expect(needsHumanHandoff("ok")).toBe(false);
  });
});
