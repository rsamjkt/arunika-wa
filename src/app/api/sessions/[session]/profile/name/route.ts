import { NextRequest, NextResponse } from "next/server";
import { setProfileName, WahaError } from "@/lib/waha";

type Params = { params: Promise<{ session: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { session } = await params;
  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "name wajib diisi" }, { status: 400 });
    }
    await setProfileName(session, name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
