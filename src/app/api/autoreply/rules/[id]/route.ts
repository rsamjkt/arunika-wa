import { NextRequest, NextResponse } from "next/server";
import { deleteRule, updateRule } from "@/lib/autoreply";
import { requireFeature } from "@/lib/authz";
import { getEffectiveTenantId } from "@/lib/users";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireFeature("autoreply");
  if (response) return response;

  const { id } = await params;
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { keywords, reply, enabled } = body!;
  updateRule(getEffectiveTenantId(user!), id, {
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
  deleteRule(getEffectiveTenantId(user!), id);
  return NextResponse.json({ ok: true });
}
