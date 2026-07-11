import { NextRequest, NextResponse } from "next/server";
import { setTyping, WahaError } from "@/lib/waha";
import { requireSessionAccess } from "@/lib/tenancy";

export async function POST(req: NextRequest) {
  const { session, chatId, state } = await req.json();
  if (!session || !chatId || (state !== "start" && state !== "stop")) {
    return NextResponse.json(
      { error: "session, chatId, dan state ('start' atau 'stop') wajib diisi" },
      { status: 400 },
    );
  }
  const { response } = await requireSessionAccess(session);
  if (response) return response;

  try {
    await setTyping(session, chatId, state);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
