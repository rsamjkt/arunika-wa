import { NextRequest, NextResponse } from "next/server";
import { requireSessionAccess } from "@/lib/tenancy";
import { getEffectiveTenantId, getGoverningUser } from "@/lib/users";
import { userHasFeature } from "@/lib/authz";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { getMessages } from "@/lib/waha";
import { getAISettings, canUseAIToday, recordAIUsage } from "@/lib/aiAutoReply";
import { generateAIReply, isModelConfigured } from "@/lib/aiClient";
import { retrieveKB } from "@/lib/kbRetrieval";

// AI co-pilot: menyusun DRAFT balasan untuk AGEN (bukan auto-kirim). Agen tetap
// meninjau & mengirim manual — jadi ini bantuan produktivitas, bukan bot.
export async function POST(req: NextRequest) {
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { session, chatId } = body!;
  if (!session || !chatId || typeof session !== "string" || typeof chatId !== "string") {
    return NextResponse.json({ error: "session dan chatId wajib diisi" }, { status: 400 });
  }

  const { user, response } = await requireSessionAccess(session);
  if (response) return response;

  const ownerId = getEffectiveTenantId(user!);
  const gov = getGoverningUser(user!);
  if (!userHasFeature(gov, "ai_autoreply")) {
    return NextResponse.json({ error: "Fitur AI tidak tersedia di paket Anda" }, { status: 403 });
  }

  const ai = getAISettings(ownerId);
  if (!isModelConfigured(ai.model)) {
    return NextResponse.json({ error: "Model AI belum dikonfigurasi. Atur di /admin/ai-providers." }, { status: 400 });
  }
  if (!canUseAIToday(ownerId)) {
    return NextResponse.json({ error: "Kuota AI harian sudah habis" }, { status: 429 });
  }

  const history = await getMessages(session, chatId, 15).catch(() => []);
  if (history.length === 0) {
    return NextResponse.json({ error: "Belum ada pesan untuk disarankan balasannya" }, { status: 400 });
  }
  const transcript = history
    .slice()
    .reverse()
    .map((m) => `${m.fromMe ? "Agen" : "Pelanggan"}: ${m.body || (m.hasMedia ? "[media]" : "")}`)
    .join("\n");
  const lastCustomer = history.find((m) => !m.fromMe)?.body ?? "";
  const kb = retrieveKB(ai.knowledgeBase, lastCustomer);

  const sys = [
    `Kamu asisten yang membantu AGEN customer service ${ai.businessName || "sebuah bisnis"} menyusun DRAFT balasan WhatsApp.`,
    `Gaya bicara: ${ai.tone}. Bahasa Indonesia, singkat (2-4 kalimat), sopan & natural gaya chat WhatsApp.`,
    kb ? `Informasi bisnis relevan (pakai bila cocok, jangan mengarang di luar ini):\n${kb}` : "",
    `Tulis SATU draft balasan siap-kirim untuk giliran "Agen" berikutnya. Jangan beri penjelasan/opsi ganda — cukup teks balasannya saja.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const suggestion = await generateAIReply(sys, `${transcript}\n\nDraft balasan Agen berikutnya:`, ai.model);
    recordAIUsage(ownerId);
    return NextResponse.json({ suggestion });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal membuat saran" }, { status: 502 });
  }
}
