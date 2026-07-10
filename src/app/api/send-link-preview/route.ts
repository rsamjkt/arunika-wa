import { NextRequest, NextResponse } from "next/server";
import { sendLinkPreview, WahaError } from "@/lib/waha";

export async function POST(req: NextRequest) {
  try {
    const { session, chatId, url, title } = await req.json();
    if (!session || !chatId || !url || !title) {
      return NextResponse.json(
        { error: "session, chatId, url, dan title wajib diisi" },
        { status: 400 },
      );
    }
    const message = await sendLinkPreview(session, chatId, url, title);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
