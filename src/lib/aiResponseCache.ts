import { readJson, writeJson } from "./store";

// Cache jawaban AUTO-REPLY untuk pertanyaan yang identik (mode CS/knowledge-base,
// bukan free-chat yang bergantung konteks). Hemat biaya: FAQ yang sama ditanya
// banyak pelanggan → satu jawaban, tanpa call LLM berulang. Kunci per-tenant
// (ownerId) + model + teks ternormalisasi. TTL pendek agar tak basi.
const FILE = "ai-response-cache.json";
const TTL_MS = 2 * 60 * 60 * 1000; // 2 jam
const MAX_ENTRIES = 500;

type Entry = { reply: string; at: number };
type Store = Record<string, Entry>;

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 300);
}
function key(ownerId: string, model: string, text: string): string {
  return `${ownerId}::${model}::${normalize(text)}`;
}

/** Jawaban ter-cache yang masih segar, atau null. */
export function getCachedReply(ownerId: string, model: string, text: string): string | null {
  if (normalize(text).length < 3) return null;
  const e = readJson<Store>(FILE, {})[key(ownerId, model, text)];
  if (!e || Date.now() - e.at > TTL_MS) return null;
  return e.reply;
}

/** Simpan jawaban; buang yang kedaluwarsa & batasi ukuran store. */
export function setCachedReply(ownerId: string, model: string, text: string, reply: string): void {
  if (normalize(text).length < 3) return;
  const store = readJson<Store>(FILE, {});
  store[key(ownerId, model, text)] = { reply, at: Date.now() };
  const now = Date.now();
  const fresh = Object.entries(store).filter(([, v]) => now - v.at <= TTL_MS);
  const bounded = fresh.length > MAX_ENTRIES ? fresh.slice(-MAX_ENTRIES) : fresh;
  writeJson(FILE, Object.fromEntries(bounded));
}
