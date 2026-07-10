import { NextRequest, NextResponse } from "next/server";
import { sendText, WahaError } from "@/lib/waha";

export async function POST(req: NextRequest) {
  try {
    const { session, chatId, text } = await req.json();
    if (!session || !chatId || !text) {
      return NextResponse.json(
        { error: "session, chatId, dan text wajib diisi" },
        { status: 400 },
      );
    }
    const message = await sendText(session, chatId, text);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
