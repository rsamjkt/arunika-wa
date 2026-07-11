import { NextResponse } from "next/server";
import { deleteApiKey, revokeApiKey } from "@/lib/apikeys";
import { getCurrentFullUser } from "@/lib/currentUser";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  revokeApiKey(user.id, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  deleteApiKey(user.id, id);
  return NextResponse.json({ ok: true });
}
