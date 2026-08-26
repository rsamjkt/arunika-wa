import { readJson, writeJson } from "./store";

// Web search via Tavily (AI-search API). Key disimpan lokal (gitignored) atau env
// TAVILY_API_KEY. Dipakai Arunika untuk menjawab pertanyaan yang butuh info TERKINI
// (berita, harga, cuaca, dll) yang tak ada di pengetahuan model.
const FILE = "web-search.json";
type Cfg = { tavilyKey?: string };

export function getTavilyKey(): string {
  return readJson<Cfg>(FILE, {}).tavilyKey || process.env.TAVILY_API_KEY || "";
}

export function setTavilyKey(key: string): void {
  writeJson<Cfg>(FILE, { ...readJson<Cfg>(FILE, {}), tavilyKey: key.trim() });
}

export function isWebSearchConfigured(): boolean {
  return getTavilyKey().length > 0;
}

// Heuristik hemat: hanya cari ke web bila pesan mengandung sinyal butuh info
// TERKINI/faktual — supaya obrolan santai biasa tak memicu pencarian (& biaya).
const TRIGGERS =
  /\b(berita|terbaru|terkini|harga|kurs|dolar|cuaca|ramalan|prakiraan|skor|hasil (pertandingan|bola|liga|piala)|jadwal (bola|tayang|rilis|film)|kapan (rilis|tayang|mulai)|viral|trending|nilai tukar|bmkg|gempa|carikan?|googling|cek harga|info tentang|kabar terbaru|update terbaru|siapa (presiden|menteri|ceo|pemenang))\b/i;

/** Query pencarian bila pesan butuh web, atau null. */
export function searchQueryFor(text: string): string | null {
  if (!text || text.trim().length < 3) return null;
  if (!TRIGGERS.test(text)) return null;
  return text.trim().slice(0, 300);
}

export type SearchHit = { title: string; url: string; content: string };
export type SearchResult = { answer: string; results: SearchHit[] };

type TavilyRaw = { answer?: unknown; results?: Array<{ title?: unknown; url?: unknown; content?: unknown }> };
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Cari via Tavily; kembalikan ringkasan + top hasil (null bila gagal/tak dikonfigurasi). */
export async function tavilySearch(query: string): Promise<SearchResult | null> {
  const key = getTavilyKey();
  if (!key) return null;
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        max_results: 5,
        search_depth: "basic",
        include_answer: true,
      }),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as TavilyRaw;
    return {
      answer: str(d.answer),
      results: (d.results ?? []).slice(0, 5).map((r) => ({
        title: str(r.title),
        url: str(r.url),
        content: str(r.content).slice(0, 500),
      })),
    };
  } catch {
    return null;
  }
}
