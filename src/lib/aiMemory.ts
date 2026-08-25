import { readJson, writeJson } from "./store";

// Ingatan jangka panjang per-kontak: "profil" fakta tahan-lama (nama, hobi,
// pekerjaan, preferensi, hal penting yang pernah disebut) yang bertahan LINTAS
// sesi — melengkapi jendela 20-pesan yang cuma ingatan jangka-pendek.
// Disimpan lokal (file JSON), key = `session:chatId`. Diperbarui berkala oleh
// LLM (di webhook) agar tak menambah panggilan di setiap pesan.
const FILE = "ai-memory.json";

type MemEntry = { profile: string; count: number; updatedAt: string };
type Store = Record<string, MemEntry>;

const key = (session: string, chatId: string) => `${session}:${chatId}`;

/** Profil fakta yang diingat tentang kontak ini (string kosong bila belum ada). */
export function getMemory(session: string, chatId: string): string {
  return readJson<Store>(FILE, {})[key(session, chatId)]?.profile ?? "";
}

/** Naikkan penghitung pesan kontak, kembalikan true bila giliran memperbarui
 * ingatan (tiap ~everyN pesan) — supaya ekstraksi fakta tak jalan tiap pesan
 * (hemat panggilan LLM & kuota di free-tier). */
export function bumpAndShouldUpdate(session: string, chatId: string, everyN = 4): boolean {
  const store = readJson<Store>(FILE, {});
  const k = key(session, chatId);
  const entry = store[k] ?? { profile: "", count: 0, updatedAt: "" };
  entry.count = (entry.count ?? 0) + 1;
  store[k] = entry;
  writeJson(FILE, store);
  return entry.count % everyN === 1; // perbarui di pesan ke-1, 5, 9, ...
}

/** Simpan profil terbaru (dibatasi panjang agar prompt tak membengkak). */
export function saveMemory(session: string, chatId: string, profile: string): void {
  const store = readJson<Store>(FILE, {});
  const k = key(session, chatId);
  const prev = store[k] ?? { profile: "", count: 0, updatedAt: "" };
  store[k] = { ...prev, profile: profile.trim().slice(0, 1500), updatedAt: new Date().toISOString() };
  writeJson(FILE, store);
}

/** Cascade delete bila kontak/sesi dibersihkan (opsional dipakai). */
export function deleteMemory(session: string, chatId: string): void {
  const store = readJson<Store>(FILE, {});
  delete store[key(session, chatId)];
  writeJson(FILE, store);
}
