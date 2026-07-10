import { NextRequest, NextResponse } from "next/server";
import { unblockContact, WahaError } from "@/lib/waha";

type Params = { params: Promise<{ session: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { session } = await params;
  try {
    const { contactId } = await req.json();
    if (!contactId) {
      return NextResponse.json({ error: "contactId wajib diisi" }, { status: 400 });
    }
    await unblockContact(session, contactId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
