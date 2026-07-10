import { NextRequest, NextResponse } from "next/server";
import { replyMessage, WahaError } from "@/lib/waha";

export async function POST(req: NextRequest) {
  try {
    const { session, chatId, replyTo, text } = await req.json();
    if (!session || !chatId || !replyTo || !text) {
      return NextResponse.json(
        { error: "session, chatId, replyTo, dan text wajib diisi" },
        { status: 400 },
      );
    }
    const message = await replyMessage(session, chatId, replyTo, text);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
