import { NextRequest, NextResponse } from "next/server";
import { createGroup, listGroups, WahaError } from "@/lib/waha";

type Params = { params: Promise<{ session: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { session } = await params;
  try {
    const groups = await listGroups(session);
    return NextResponse.json(groups);
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { session } = await params;
  try {
    const { name, participants } = await req.json();
    if (!name || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: "name dan participants (array {id}) wajib diisi" },
        { status: 400 },
      );
    }
    const group = await createGroup(session, name, participants);
    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
