import { NextRequest, NextResponse } from "next/server";
import { sendLinkPreview, WahaError } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";

export async function POST(req: NextRequest) {
  const { session, chatId, url, title } = await req.json();
  if (!session || !chatId || !url || !title) {
    return NextResponse.json(
      { error: "session, chatId, url, dan title wajib diisi" },
      { status: 400 },
    );
  }
  try {
    const message = await sendLinkPreview(session, chatId, url, title);
    logEvent({ direction: "out", session, chatId, kind: "other", status: "sent", source: "manual" });
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logEvent({ direction: "out", session, chatId, kind: "other", status: "failed", source: "manual", error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
