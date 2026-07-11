import { NextResponse } from "next/server";
import { deleteApiKey, revokeApiKey } from "@/lib/apikeys";
import { requireFeature } from "@/lib/authz";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireFeature("apikeys");
  if (response) return response;

  const { id } = await params;
  revokeApiKey(user!.id, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireFeature("apikeys");
  if (response) return response;

  const { id } = await params;
  deleteApiKey(user!.id, id);
  return NextResponse.json({ ok: true });
}
