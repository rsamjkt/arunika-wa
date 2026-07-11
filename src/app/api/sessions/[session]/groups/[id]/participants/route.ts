import { NextRequest, NextResponse } from "next/server";
import {
  addGroupParticipants,
  getGroupParticipants,
  removeGroupParticipants,
  WahaError,
} from "@/lib/waha";
import { requireSessionAccess } from "@/lib/tenancy";

type Params = { params: Promise<{ session: string; id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { session, id } = await params;
  const { response } = await requireSessionAccess(session);
  if (response) return response;

  try {
    const participants = await getGroupParticipants(session, id);
    return NextResponse.json(participants);
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { session, id } = await params;
  const { response } = await requireSessionAccess(session);
  if (response) return response;

  try {
    const { participants } = await req.json();
    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: "participants (array {id}) wajib diisi" },
        { status: 400 },
      );
    }
    await addGroupParticipants(session, id, participants);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, id } = await params;
  const { response } = await requireSessionAccess(session);
  if (response) return response;

  try {
    const { participants } = await req.json();
    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: "participants (array {id}) wajib diisi" },
        { status: 400 },
      );
    }
    await removeGroupParticipants(session, id, participants);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
