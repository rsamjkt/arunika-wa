import { NextResponse } from "next/server";
import { restartSession, WahaError } from "@/lib/waha";

type Params = { params: Promise<{ session: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { session } = await params;
  try {
    const info = await restartSession(session);
    return NextResponse.json(info);
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
