import { NextRequest, NextResponse } from "next/server";
import { unpinMessage, WahaError } from "@/lib/waha";

export async function POST(req: NextRequest) {
  try {
    const { session, chatId, messageId } = await req.json();
    if (!session || !chatId || !messageId) {
      return NextResponse.json(
        { error: "session, chatId, dan messageId wajib diisi" },
        { status: 400 },
      );
    }
    await unpinMessage(session, chatId, messageId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
