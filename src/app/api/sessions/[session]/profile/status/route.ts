import { NextRequest, NextResponse } from "next/server";
import { setProfileStatus, WahaError } from "@/lib/waha";

type Params = { params: Promise<{ session: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { session } = await params;
  try {
    const { status: newStatus } = await req.json();
    if (!newStatus) {
      return NextResponse.json({ error: "status wajib diisi" }, { status: 400 });
    }
    await setProfileStatus(session, newStatus);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
