import { NextRequest, NextResponse } from "next/server";
import { replyMessage, WahaError } from "@/lib/waha";
import { requireSessionAccess } from "@/lib/tenancy";

export async function POST(req: NextRequest) {
  const { session, chatId, replyTo, text } = await req.json();
  if (!session || !chatId || !replyTo || !text) {
    return NextResponse.json(
      { error: "session, chatId, replyTo, dan text wajib diisi" },
      { status: 400 },
    );
  }
  const { response } = await requireSessionAccess(session);
  if (response) return response;

  try {
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
