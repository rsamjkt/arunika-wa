import { NextResponse } from "next/server";
import { getGroup, WahaError } from "@/lib/waha";
import { requireSessionAccess } from "@/lib/tenancy";

type Params = { params: Promise<{ session: string; id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { session, id } = await params;
  const { response } = await requireSessionAccess(session);
  if (response) return response;

  try {
    const group = await getGroup(session, id);
    return NextResponse.json(group);
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
