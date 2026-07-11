import { NextRequest, NextResponse } from "next/server";
import { deleteTemplate, updateTemplate } from "@/lib/templates";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, category, body } = await req.json();
  updateTemplate(id, {
    name: typeof name === "string" ? name : undefined,
    category: typeof category === "string" ? category : undefined,
    body: typeof body === "string" ? body : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteTemplate(id);
  return NextResponse.json({ ok: true });
}
