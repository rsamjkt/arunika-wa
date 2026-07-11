import { NextRequest, NextResponse } from "next/server";
import { blockContact, WahaError } from "@/lib/waha";
import { requireSessionAccess } from "@/lib/tenancy";

type Params = { params: Promise<{ session: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { session } = await params;
  const { response } = await requireSessionAccess(session);
  if (response) return response;

  try {
    const { contactId } = await req.json();
    if (!contactId) {
      return NextResponse.json({ error: "contactId wajib diisi" }, { status: 400 });
    }
    await blockContact(session, contactId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
