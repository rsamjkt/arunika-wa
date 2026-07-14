import { NextRequest, NextResponse } from "next/server";
import { setReaction, WahaError } from "@/lib/waha";
import { requireSessionAccess } from "@/lib/tenancy";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function POST(req: NextRequest) {
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { session, messageId, reaction } = body!;
  if (!session || !messageId || reaction === undefined) {
    return NextResponse.json(
      { error: "session, messageId, dan reaction wajib diisi (reaction bisa string kosong untuk hapus)" },
      { status: 400 },
    );
  }
  const { response } = await requireSessionAccess(session);
  if (response) return response;

  try {
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
