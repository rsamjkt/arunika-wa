// Registry SKILL/TOOL untuk Arunika (agentic). Tiap tool = satu kemampuan yang
// bisa DIPANGGIL AI saat menjawab (bukan cuma membalas teks). Menambah kemampuan
// = tambah satu entri di TOOLS — arsitektur modular (mendekati OpenClaw). Semua
// tool beroperasi HANYA di data milik tenant (aman, tanpa aksi eksternal liar).
import type { AIAutoReplySettings } from "./aiAutoReply";
import { retrieveKB } from "./kbRetrieval";
import { getContactNote, setContactNote } from "./contactNotes";
import { getSettings, isWithinBusinessHours } from "./autoreply";
import { getAssignment, setAssignment } from "./chatAssignments";
import { createNotification } from "./notifications";
import { calcOngkir, isShippingConfigured, trackResi } from "./shipping";

export type ToolContext = {
  ownerId: string;
  session: string;
  chatId: string;
  aiSettings: AIAutoReplySettings;
};

export type AITool = {
  name: string;
  /** Deskripsi + argumen (untuk prompt agar model tahu kapan & bagaimana memakai). */
  description: string;
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<string> | string;
};

function wibNow(): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date());
}
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export const TOOLS: AITool[] = [
  {
    name: "cek_waktu",
    description: "Cek tanggal & jam sekarang (WIB). Tanpa argumen. Pakai untuk sapaan waktu atau pertanyaan tanggal/jam.",
    run: () => wibNow(),
  },
  {
    name: "cari_pengetahuan",
    description: 'Cari info bisnis dari knowledge base. Argumen: {"query":"kata kunci pertanyaan"}. Pakai untuk cek harga/jam/produk/kebijakan sebelum menjawab.',
    run: (args, ctx) => {
      const q = str(args.query);
      const hit = retrieveKB(ctx.aiSettings.knowledgeBase, q || " ");
      return hit || "(tidak ada info relevan di knowledge base)";
    },
  },
  {
    name: "cek_jam_buka",
    description: "Cek apakah toko/bisnis sedang BUKA sekarang beserta jadwal jam operasionalnya. Tanpa argumen.",
    run: (_args, ctx) => {
      const s = getSettings(ctx.ownerId);
      if (!s.businessHours?.enabled) return "Jam operasional tidak diatur (anggap selalu buka).";
      const open = isWithinBusinessHours(s);
      return `${open ? "SEDANG BUKA" : "SEDANG TUTUP"}. Jadwal: ${s.businessHours.start}-${s.businessHours.end}, hari ${s.businessHours.days.join(",")} (1=Sen..7=Min).`;
    },
  },
  {
    name: "catat_pelanggan",
    description: 'Simpan catatan tentang pelanggan ini (mis. preferensi, pesanan) untuk dilihat agen. Argumen: {"catatan":"isi catatan singkat"}.',
    run: (args, ctx) => {
      const note = str(args.catatan);
      if (!note) return "Catatan kosong, tidak disimpan.";
      const current = getContactNote(ctx.ownerId, ctx.session, ctx.chatId);
      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      const merged = `${current.note ? current.note + "\n" : ""}[${stamp}] ${note}`.slice(0, 2000);
      setContactNote(ctx.ownerId, ctx.session, ctx.chatId, { note: merged });
      return "Catatan tersimpan.";
    },
  },
  {
    name: "hubungkan_agen",
    description: 'Alihkan percakapan ke agen manusia bila di luar kemampuanmu / pelanggan minta / komplain serius. Argumen: {"alasan":"kenapa perlu manusia"}. Setelah ini, beri tahu pelanggan bahwa kamu menyambungkan ke tim.',
    run: (args, ctx) => {
      const alasan = str(args.alasan) || "pelanggan perlu bantuan manusia";
      const asg = getAssignment(ctx.ownerId, ctx.session, ctx.chatId);
      if (!(asg.escalated && asg.status === "open")) {
        setAssignment(ctx.ownerId, ctx.session, ctx.chatId, { escalated: true, escalatedAt: new Date().toISOString(), status: "open" });
        createNotification(ctx.ownerId, "chat_handoff", "Pelanggan dialihkan ke agen (oleh AI)",
          `Chat dari ${ctx.chatId.replace(/@.*/, "")}: ${alasan}`, "/inbox");
      }
      return "Sudah dialihkan ke agen. Beri tahu pelanggan bahwa tim akan segera membantu.";
    },
  },
  {
    name: "cek_resi",
    description: 'Lacak status paket/pengiriman. Argumen: {"kurir":"jne|jnt|sicepat|anteraja|pos|tiki|ninja|wahana|lion|dll","resi":"nomor resi"}. Pakai saat pelanggan menanyakan status kiriman/paketnya.',
    run: async (args) => {
      if (!isShippingConfigured()) return "Layanan cek resi belum diaktifkan (perlu API key kurir). Sampaikan ke pelanggan untuk cek manual sementara ini.";
      const kurir = str(args.kurir).toLowerCase();
      const resi = str(args.resi);
      if (!kurir || !resi) return "Butuh nama kurir dan nomor resi.";
      return (await trackResi(kurir, resi)) || "Tidak ada info resi.";
    },
  },
  {
    name: "hitung_ongkir",
    description: 'Hitung ongkos kirim antar kota. Argumen: {"kurir":"jne|jnt|...","asal":"kode kota asal","tujuan":"kode kota tujuan","berat":gram}. Pakai saat pelanggan tanya ongkir. Jika kode kota tak diketahui, pakai tool cari_pengetahuan untuk info ongkir dari knowledge base.',
    run: async (args) => {
      if (!isShippingConfigured()) return "Layanan hitung ongkir belum diaktifkan (perlu API key kurir). Coba cari info ongkir lewat tool cari_pengetahuan.";
      const kurir = str(args.kurir).toLowerCase();
      const asal = str(args.asal);
      const tujuan = str(args.tujuan);
      const berat = Number(args.berat) > 0 ? Number(args.berat) : 1000;
      if (!kurir || !asal || !tujuan) return "Butuh kurir, kota asal, dan kota tujuan.";
      return (await calcOngkir(kurir, asal, tujuan, berat)) || "Tarif tidak ditemukan.";
    },
  },
];

export function toolByName(name: string): AITool | undefined {
  return TOOLS.find((t) => t.name === name);
}

/** Spesifikasi tools untuk disisipkan ke system prompt agent. */
export function toolsPromptSpec(): string {
  return TOOLS.map((t) => `- ${t.name}: ${t.description}`).join("\n");
}
