import { NextResponse } from "next/server";
import { getProfile, WahaError } from "@/lib/waha";

type Params = { params: Promise<{ session: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { session } = await params;
  try {
    const profile = await getProfile(session);
    return NextResponse.json(profile);
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
