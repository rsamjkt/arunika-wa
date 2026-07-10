import { NextRequest, NextResponse } from "next/server";
import { starMessage, WahaError } from "@/lib/waha";

export async function POST(req: NextRequest) {
  try {
    const { session, chatId, messageId, star } = await req.json();
    if (!session || !chatId || !messageId || typeof star !== "boolean") {
      return NextResponse.json(
        { error: "session, chatId, messageId, dan star (boolean) wajib diisi" },
        { status: 400 },
      );
    }
    await starMessage(session, chatId, messageId, star);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
