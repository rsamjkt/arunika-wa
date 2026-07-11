import { NextRequest, NextResponse } from "next/server";
import { pinMessage, WahaError } from "@/lib/waha";
import { requireSessionAccess } from "@/lib/tenancy";

export async function POST(req: NextRequest) {
  const { session, chatId, messageId, duration } = await req.json();
  if (!session || !chatId || !messageId || !duration) {
    return NextResponse.json(
      { error: "session, chatId, messageId, dan duration (detik) wajib diisi" },
      { status: 400 },
    );
  }
  const { response } = await requireSessionAccess(session);
  if (response) return response;

  try {
    await pinMessage(session, chatId, messageId, duration);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
