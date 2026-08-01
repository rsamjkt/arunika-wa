// Hemat token & kuota: balasan AI tidak perlu dipanggil untuk pesan "penutup"
// yang jelas sepele — ucapan terima kasih, "oke/sip", emoji apresiasi, atau
// teks super pendek yang bukan pertanyaan. Jika pelanggan kemudian benar-benar
// bertanya, pesan berikutnya itulah yang memicu AI (lihat scheduleAIAutoReply
// di webhook WAHA), jadi tak ada pertanyaan yang terlewat.
//
// Sengaja KONSERVATIF: sebuah pesan hanya dianggap sepele bila SETIAP katanya
// termasuk kata penutup/filler yang dikenal, tidak mengandung "?", dan pendek.
// Pesan sedikit saja yang tak dikenali akan lolos ke AI (aman: paling boros,
// bukan salah balas).

const TRIVIAL_WORDS = new Set<string>([
  // penutup / afirmasi
  "ok", "oke", "okay", "okey", "okee", "sip", "sipp", "sippp", "siap", "baik", "baiklah",
  "noted", "beres", "mantap", "mantab", "mantaap", "keren", "good", "nice", "great",
  // terima kasih
  "makasih", "makasi", "makasiih", "mksh", "trims", "trm", "thanks", "thank", "thankyou",
  "you", "tq", "tks", "terima", "kasih", "thx",
  // tawa (sering sekadar reaksi, bukan pertanyaan)
  "hehe", "haha", "wkwk", "wkwkwk", "hehehe", "hahaha", "xixi", "hmm", "hm",
  // filler / sapaan pendek yang lazim menempel di penutup
  "ya", "yaa", "yaaa", "iya", "iyaa", "yoi", "yup", "yep", "kak", "ka", "min", "gan",
  "bang", "bg", "bro", "sis", "om", "bu", "pak", "mas", "mbak", "dong", "deh", "sih",
  "aja", "banyak", "banget", "bgt", "banyk", "yah", "oke2",
]);

/** True jika pesan pelanggan tak butuh balasan AI (hemat panggilan LLM). */
export function isTrivialMessage(text: string): boolean {
  const t = (text ?? "").trim();
  if (!t) return false; // pesan kosong / media-only: biarkan alur lama menangani
  if (t.includes("?")) return false; // pertanyaan tak pernah dianggap sepele
  // buang emoji & tanda baca, pisah jadi kata
  const tokens = t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true; // hanya emoji/tanda baca, mis. "🙏🙏"
  if (tokens.length > 5) return false; // frasa panjang: kemungkinan ada maksud lain
  return tokens.every((w) => TRIVIAL_WORDS.has(w));
}
