import { NextResponse } from "next/server";
import { getLabels, WahaError } from "@/lib/waha";

type Params = { params: Promise<{ session: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { session } = await params;
  try {
    const labels = await getLabels(session);
    return NextResponse.json(labels);
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
