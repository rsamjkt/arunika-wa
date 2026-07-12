import { NextRequest, NextResponse } from "next/server";
import { createTemplate, listTemplates } from "@/lib/templates";
import { requireFeature } from "@/lib/authz";
import { getEffectiveTenantId } from "@/lib/users";

export async function GET() {
  const { user, response } = await requireFeature("templates");
  if (response) return response;
  return NextResponse.json(listTemplates(getEffectiveTenantId(user!)));
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireFeature("templates");
  if (response) return response;

  const { name, category, body } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Nama template wajib diisi" }, { status: 400 });
  }
  if (!body || typeof body !== "string") {
    return NextResponse.json({ error: "Isi pesan wajib diisi" }, { status: 400 });
  }
  const template = createTemplate(getEffectiveTenantId(user!), name, typeof category === "string" ? category : "", body);
  return NextResponse.json(template, { status: 201 });
}
