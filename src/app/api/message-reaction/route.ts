import { NextRequest, NextResponse } from "next/server";
import { setReaction, WahaError } from "@/lib/waha";

export async function POST(req: NextRequest) {
  try {
    const { session, messageId, reaction } = await req.json();
    if (!session || !messageId || reaction === undefined) {
      return NextResponse.json(
        { error: "session, messageId, dan reaction wajib diisi (reaction bisa string kosong untuk hapus)" },
        { status: 400 },
      );
    }
    await setReaction(session, messageId, reaction);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
