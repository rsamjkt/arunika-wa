import { describe, expect, it } from "vitest";
import { isTrivialMessage } from "./aiTriviality";

describe("isTrivialMessage", () => {
  it("menandai ucapan penutup sepele sebagai true (skip LLM)", () => {
    for (const t of ["ok", "oke", "sip", "makasih", "makasih ya", "thanks", "terima kasih", "👍", "🙏🙏", "mantap!", "noted", "ya"]) {
      expect(isTrivialMessage(t), t).toBe(true);
    }
  });

  it("TIDAK menandai pertanyaan / permintaan nyata sebagai sepele", () => {
    for (const t of [
      "jam buka berapa?",
      "harga es kopi susu?",
      "ok tapi kalau reservasi gimana?",
      "makasih, btw ada promo?",
      "bisa kirim ke Jakarta?",
      "saya mau pesan 2 croissant",
      "alamatnya di mana",
    ]) {
      expect(isTrivialMessage(t), t).toBe(false);
    }
  });

  it("membiarkan pesan kosong/media-only ditangani alur lama (false)", () => {
    expect(isTrivialMessage("")).toBe(false);
    expect(isTrivialMessage("   ")).toBe(false);
  });

  it("tahan terhadap tanda baca & huruf besar", () => {
    expect(isTrivialMessage("OKE!!")).toBe(true);
    expect(isTrivialMessage("Makasih banyak 🙏")).toBe(true);
    expect(isTrivialMessage("Sipp~")).toBe(true);
  });
});
