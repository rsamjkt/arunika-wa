// RAG-lite untuk knowledge base auto-reply. Alih-alih menjejalkan SELURUH KB
// ke tiap prompt (mahal + kurang fokus), KB dipecah menjadi potongan lalu hanya
// potongan paling relevan dengan pesan pelanggan yang disuntik. Skoring memakai
// tumpang-tindih kata kunci (tanpa embeddings/vektor eksternal → nol dependency,
// nol biaya, deterministik & mudah diuji). Cocok untuk FAQ bisnis.

const MAX_CHUNKS = 4;
const MAX_CHARS = 1600;

// Kata umum Indonesia yang tak membedakan makna — diabaikan saat skoring.
const STOPWORDS = new Set([
  "yang", "dan", "atau", "untuk", "dengan", "ini", "itu", "ada", "apa", "apakah",
  "saya", "kamu", "aku", "kami", "kita", "anda", "gimana", "bagaimana", "kenapa",
  "mengapa", "mau", "ingin", "bisa", "boleh", "tidak", "gak", "nggak", "belum",
  "sudah", "juga", "saja", "aja", "dari", "pada", "dalam", "akan", "kalau", "jika",
  "punya", "tentang", "tolong", "mohon", "halo", "hai", "kak", "min", "dong", "ya",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/** Pecah KB jadi potongan: per paragraf (baris kosong), lalu paragraf sangat
 * panjang dipecah lagi per baris. Kosong dibuang. */
export function splitIntoChunks(kb: string): string[] {
  const paras = kb
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of paras) {
    if (p.length <= 400) out.push(p);
    else for (const line of p.split(/\n/).map((l) => l.trim()).filter(Boolean)) out.push(line);
  }
  return out;
}

function score(queryTokens: Set<string>, chunk: string): number {
  const seen = new Set(tokenize(chunk));
  let s = 0;
  for (const q of queryTokens) if (seen.has(q)) s++;
  return s;
}

/** Kembalikan potongan KB paling relevan dengan `query`, dibatasi jumlah &
 * panjang. Bila tak ada yang cocok (atau query kosong), pakai awal KB sebagai
 * fallback agar model tetap punya konteks. */
export function retrieveKB(kb: string, query: string, maxChunks = MAX_CHUNKS, maxChars = MAX_CHARS): string {
  const chunks = splitIntoChunks(kb);
  if (chunks.length === 0) return "";

  const qTokens = new Set(tokenize(query));
  let ranked: string[];
  if (qTokens.size === 0) {
    ranked = chunks; // tanpa query → urutan asli (awal KB)
  } else {
    const scored = chunks
      .map((c) => ({ c, s: score(qTokens, c) }))
      .sort((a, b) => b.s - a.s);
    const hits = scored.filter((x) => x.s > 0).map((x) => x.c);
    ranked = hits.length > 0 ? hits : chunks; // fallback: awal KB bila nihil
  }

  const picked: string[] = [];
  let used = 0;
  for (const c of ranked) {
    if (picked.length >= maxChunks) break;
    if (used + c.length > maxChars && picked.length > 0) break;
    picked.push(c);
    used += c.length + 2;
  }
  return picked.join("\n\n");
}
