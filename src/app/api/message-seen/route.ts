import { NextRequest, NextResponse } from "next/server";
import { sendSeen, WahaError } from "@/lib/waha";

export async function POST(req: NextRequest) {
  try {
    const { session, chatId, messageIds } = await req.json();
    if (!session || !chatId) {
      return NextResponse.json(
        { error: "session dan chatId wajib diisi" },
        { status: 400 },
      );
    }
    await sendSeen(session, chatId, messageIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
