import { NextRequest, NextResponse } from "next/server";
import { requireSessionAccess } from "@/lib/tenancy";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { subscribePresence } from "@/lib/waha";

// Dipanggil inbox saat membuka chat — meminta WAHA mengirim event presence
// (mis. "sedang mengetik") untuk kontak tsb. Best-effort (bergantung engine).
export async function POST(req: NextRequest) {
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { session, chatId } = body!;
  if (!session || !chatId || typeof session !== "string" || typeof chatId !== "string") {
    return NextResponse.json({ error: "session dan chatId wajib diisi" }, { status: 400 });
  }
  const { response } = await requireSessionAccess(session);
  if (response) return response;
  await subscribePresence(session, chatId).catch(() => {});
  return NextResponse.json({ ok: true });
}
