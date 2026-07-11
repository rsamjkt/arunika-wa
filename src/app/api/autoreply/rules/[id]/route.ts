import { NextRequest, NextResponse } from "next/server";
import { deleteRule, updateRule } from "@/lib/autoreply";
import { requireFeature } from "@/lib/authz";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireFeature("autoreply");
  if (response) return response;

  const { id } = await params;
  const body = await req.json();
  const { keywords, reply, enabled } = body;
  updateRule(user!.id, id, {
    keywords: Array.isArray(keywords) ? keywords : undefined,
    reply: typeof reply === "string" ? reply : undefined,
    enabled: typeof enabled === "boolean" ? enabled : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireFeature("autoreply");
  if (response) return response;

  const { id } = await params;
  deleteRule(user!.id, id);
  return NextResponse.json({ ok: true });
}
