import { NextResponse } from "next/server";
import { leaveGroup, WahaError } from "@/lib/waha";

type Params = { params: Promise<{ session: string; id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { session, id } = await params;
  try {
    await leaveGroup(session, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
