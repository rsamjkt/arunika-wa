import { NextRequest, NextResponse } from "next/server";
import { getAllContacts, WahaError } from "@/lib/waha";

type Params = { params: Promise<{ session: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { session } = await params;
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 50);
  const offset = Number(req.nextUrl.searchParams.get("offset") ?? 0);
  try {
    const contacts = await getAllContacts(session, limit, offset);
    return NextResponse.json(contacts);
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
