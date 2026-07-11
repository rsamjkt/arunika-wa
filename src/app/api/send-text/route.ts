import { NextRequest, NextResponse } from "next/server";
import { sendText, WahaError } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";

export async function POST(req: NextRequest) {
  const { session, chatId, text } = await req.json();
  if (!session || !chatId || !text) {
    return NextResponse.json(
      { error: "session, chatId, dan text wajib diisi" },
      { status: 400 },
    );
  }
  try {
    const message = await sendText(session, chatId, text);
    logEvent({ direction: "out", session, chatId, kind: "text", status: "sent", source: "manual" });
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logEvent({ direction: "out", session, chatId, kind: "text", status: "failed", source: "manual", error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
