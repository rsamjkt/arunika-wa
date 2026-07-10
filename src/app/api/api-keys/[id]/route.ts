import { NextResponse } from "next/server";
import { deleteApiKey, revokeApiKey } from "@/lib/apikeys";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  revokeApiKey(id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteApiKey(id);
  return NextResponse.json({ ok: true });
}
