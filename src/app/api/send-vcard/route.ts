import { NextRequest, NextResponse } from "next/server";
import { sendContactVcard, WahaError, type VCardContact } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";

export async function POST(req: NextRequest) {
  const { session, chatId, contacts } = await req.json();
  if (!session || !chatId || !Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json(
      { error: "session, chatId, dan contacts (array vcard) wajib diisi" },
      { status: 400 },
    );
  }
  try {
    const message = await sendContactVcard(
      session,
      chatId,
      contacts as VCardContact[],
    );
    logEvent({ direction: "out", session, chatId, kind: "vcard", status: "sent", source: "manual" });
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logEvent({ direction: "out", session, chatId, kind: "vcard", status: "failed", source: "manual", error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
