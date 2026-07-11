import { NextRequest, NextResponse } from "next/server";
import { deleteRule, updateRule } from "@/lib/autoreply";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { keywords, reply, enabled } = body;
  updateRule(id, {
    keywords: Array.isArray(keywords) ? keywords : undefined,
    reply: typeof reply === "string" ? reply : undefined,
    enabled: typeof enabled === "boolean" ? enabled : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteRule(id);
  return NextResponse.json({ ok: true });
}
