import { NextRequest, NextResponse } from "next/server";
import { sendContactVcard, WahaError, type VCardContact } from "@/lib/waha";

export async function POST(req: NextRequest) {
  try {
    const { session, chatId, contacts } = await req.json();
    if (!session || !chatId || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: "session, chatId, dan contacts (array vcard) wajib diisi" },
        { status: 400 },
      );
    }
    const message = await sendContactVcard(
      session,
      chatId,
      contacts as VCardContact[],
    );
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
