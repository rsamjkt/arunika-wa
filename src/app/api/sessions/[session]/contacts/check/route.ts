import { NextRequest, NextResponse } from "next/server";
import { checkNumberExists, WahaError } from "@/lib/waha";
import { requireSessionAccess } from "@/lib/tenancy";

type Params = { params: Promise<{ session: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { session } = await params;
  const { response } = await requireSessionAccess(session);
  if (response) return response;

  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) {
    return NextResponse.json({ error: "phone wajib diisi" }, { status: 400 });
  }
  try {
    const result = await checkNumberExists(session, phone);
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
