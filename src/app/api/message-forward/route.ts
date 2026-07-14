import { NextRequest, NextResponse } from "next/server";
import { forwardMessage, WahaError } from "@/lib/waha";
import { requireSessionAccess } from "@/lib/tenancy";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function POST(req: NextRequest) {
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { session, chatId, messageId } = body!;
  if (!session || !chatId || !messageId) {
    return NextResponse.json(
      { error: "session, chatId, dan messageId wajib diisi" },
      { status: 400 },
    );
  }
  const { response } = await requireSessionAccess(session);
  if (response) return response;

  try {
    const message = await forwardMessage(session, chatId, messageId);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
