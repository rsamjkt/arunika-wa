import { describe, expect, it } from "vitest";
import { retrieveKB, splitIntoChunks, tokenize } from "./kbRetrieval";

const KB = `Jam buka toko: Senin-Sabtu 09.00-21.00, Minggu tutup.

Ongkir: gratis untuk pembelian di atas Rp200.000, di bawah itu flat Rp15.000.

Cara pesan: kirim nama produk dan jumlah, lalu transfer ke rekening BCA kami.

Garansi: semua produk bergaransi tukar 7 hari bila ada cacat produksi.`;

describe("tokenize", () => {
  it("buang stopword & kata pendek", () => {
    expect(tokenize("apakah ada garansi ya")).toEqual(["garansi"]);
  });
});

describe("splitIntoChunks", () => {
  it("pecah per paragraf", () => {
    expect(splitIntoChunks(KB).length).toBe(4);
  });
});

describe("retrieveKB", () => {
  it("ambil chunk relevan dengan pertanyaan", () => {
    const r = retrieveKB(KB, "berapa ongkir kirim?");
    expect(r).toContain("Ongkir");
    expect(r).not.toContain("Garansi"); // tak relevan → tak ikut bila ada yang lebih cocok
  });
  it("pertanyaan garansi menarik chunk garansi", () => {
    expect(retrieveKB(KB, "produk rusak apakah bisa tukar garansi?")).toContain("Garansi");
  });
  it("query kosong → fallback awal KB (tetap ada konteks)", () => {
    expect(retrieveKB(KB, "").length).toBeGreaterThan(0);
  });
  it("KB kosong → string kosong", () => {
    expect(retrieveKB("", "apa saja")).toBe("");
  });
  it("dibatasi panjang maxChars", () => {
    expect(retrieveKB(KB, "jam ongkir pesan garansi", 4, 40).length).toBeLessThanOrEqual(120);
  });
});
