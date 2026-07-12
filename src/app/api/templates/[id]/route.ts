import { NextRequest, NextResponse } from "next/server";
import { deleteTemplate, updateTemplate } from "@/lib/templates";
import { requireFeature } from "@/lib/authz";
import { getEffectiveTenantId } from "@/lib/users";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireFeature("templates");
  if (response) return response;

  const { id } = await params;
  const { name, category, body } = await req.json();
  updateTemplate(getEffectiveTenantId(user!), id, {
    name: typeof name === "string" ? name : undefined,
    category: typeof category === "string" ? category : undefined,
    body: typeof body === "string" ? body : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireFeature("templates");
  if (response) return response;

  const { id } = await params;
  deleteTemplate(getEffectiveTenantId(user!), id);
  return NextResponse.json({ ok: true });
}
