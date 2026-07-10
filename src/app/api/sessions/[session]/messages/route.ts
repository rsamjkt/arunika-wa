import { NextRequest, NextResponse } from "next/server";
import { getMessages, WahaError } from "@/lib/waha";

type Params = { params: Promise<{ session: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { session } = await params;
  const chatId = req.nextUrl.searchParams.get("chatId");
  if (!chatId) {
    return NextResponse.json({ error: "chatId wajib diisi" }, { status: 400 });
  }
  try {
    const messages = await getMessages(session, chatId);
    return NextResponse.json(messages);
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
