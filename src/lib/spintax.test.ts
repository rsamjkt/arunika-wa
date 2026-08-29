import { describe, expect, it } from "vitest";
import { applySpintax, hasSpintax, spintaxVariants } from "./spintax";

// RNG deterministik: selalu pilih opsi indeks tertentu.
const pick = (idx: number) => () => idx / 1000; // Math.floor((idx/1000)*len) -> 0 utk len kecil

describe("applySpintax", () => {
  it("memilih opsi pertama saat rnd=0", () => {
    expect(applySpintax("{Halo|Hai|Hei} kak", () => 0)).toBe("Halo kak");
  });
  it("memilih opsi terakhir saat rnd mendekati 1", () => {
    expect(applySpintax("{Halo|Hai|Hei} kak", () => 0.999)).toBe("Hei kak");
  });
  it("menangani beberapa grup", () => {
    expect(applySpintax("{Halo|Hai} {kak|kakak}", () => 0)).toBe("Halo kak");
  });
  it("menangani nesting", () => {
    expect(applySpintax("{Selamat {pagi|siang}|Halo}", () => 0)).toBe("Selamat pagi");
  });
  it("teks tanpa spintax tak berubah", () => {
    expect(applySpintax("Halo kak, promo hari ini!", () => 0.5)).toBe("Halo kak, promo hari ini!");
  });
  it("opsi kosong diperbolehkan", () => {
    expect(applySpintax("Halo{ kak|}", () => 0.999)).toBe("Halo");
  });
});

describe("hasSpintax", () => {
  it("deteksi grup pilihan", () => {
    expect(hasSpintax("{a|b}")).toBe(true);
    expect(hasSpintax("tanpa pilihan")).toBe(false);
    expect(hasSpintax("{tanpa-pipe}")).toBe(false);
  });
});

describe("spintaxVariants", () => {
  it("hitung kombinasi", () => {
    expect(spintaxVariants("{a|b|c} {x|y}")).toBe(6);
    expect(spintaxVariants("polos")).toBe(1);
  });
});
