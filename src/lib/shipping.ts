import { readJson, writeJson } from "./store";

// Integrasi kurir (cek resi & hitung ongkir). Pakai API Binderbyte (mendukung
// banyak kurir Indonesia). Key disimpan di data/shipping.json (gitignored) atau
// env BINDERBYTE_API_KEY. Bila tak dikonfigurasi, tool AI memberi tahu dengan
// sopan alih-alih error — pola sama seperti web search (Tavily).
const FILE = "shipping.json";
const BASE = "https://api.binderbyte.com/v1";

type Cfg = { apiKey?: string };
export function getShippingKey(): string {
  return readJson<Cfg>(FILE, {}).apiKey || process.env.BINDERBYTE_API_KEY || "";
}
export function isShippingConfigured(): boolean {
  return getShippingKey().length > 0;
}

/** Lacak paket: kurir + nomor resi (AWB). Kembalikan ringkasan status. */
export async function trackResi(courier: string, awb: string): Promise<string> {
  const key = getShippingKey();
  if (!key) return "";
  try {
    const url = `${BASE}/track?api_key=${encodeURIComponent(key)}&courier=${encodeURIComponent(courier)}&awb=${encodeURIComponent(awb)}`;
    const res = await fetch(url);
    const d = (await res.json()) as { status?: number; message?: string; data?: { summary?: Record<string, string>; history?: { date: string; desc: string }[] } };
    if (d.status !== 200 || !d.data) return `Tidak ketemu: ${d.message ?? "resi/kurir tidak valid"}`;
    const s = d.data.summary ?? {};
    const last = d.data.history?.[0];
    return `Kurir ${s.courier ?? courier}, resi ${s.awb ?? awb} — status: ${s.status ?? "-"}.` +
      (last ? ` Update: ${last.date} — ${last.desc}.` : "");
  } catch {
    return "Gagal menghubungi layanan cek resi.";
  }
}

/** Hitung ongkir antar kota (kode kota Binderbyte) + berat gram. */
export async function calcOngkir(courier: string, origin: string, destination: string, weightGram: number): Promise<string> {
  const key = getShippingKey();
  if (!key) return "";
  try {
    const url = `${BASE}/cost?api_key=${encodeURIComponent(key)}&courier=${encodeURIComponent(courier)}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&weight=${weightGram}`;
    const res = await fetch(url);
    const d = (await res.json()) as { status?: number; message?: string; data?: { costs?: { service: string; cost: number; etd?: string }[] } };
    if (d.status !== 200 || !d.data) return `Gagal: ${d.message ?? "data tidak valid"}`;
    const costs = d.data.costs ?? [];
    if (!costs.length) return "Tarif tidak ditemukan.";
    return costs.slice(0, 4).map((c) => `${c.service}: Rp${Number(c.cost).toLocaleString("id-ID")}${c.etd ? ` (${c.etd} hari)` : ""}`).join("; ");
  } catch {
    return "Gagal menghubungi layanan ongkir.";
  }
}

export function setShippingKey(key: string): void {
  writeJson<Cfg>(FILE, { ...readJson<Cfg>(FILE, {}), apiKey: key.trim() });
}
export function maskedShippingKey(): string | null {
  const k = getShippingKey();
  if (!k) return null;
  return k.length <= 8 ? "••••" : `${k.slice(0, 4)}••••${k.slice(-4)}`;
}
