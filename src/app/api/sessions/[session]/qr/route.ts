import { NextResponse } from "next/server";
import { getQrPng, WahaError } from "@/lib/waha";

type Params = { params: Promise<{ session: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { session } = await params;
  try {
    const png = await getQrPng(session);
    return new NextResponse(png, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
