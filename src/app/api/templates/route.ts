import { NextRequest, NextResponse } from "next/server";
import { createTemplate, listTemplates } from "@/lib/templates";

export async function GET() {
  return NextResponse.json(listTemplates());
}

export async function POST(req: NextRequest) {
  const { name, category, body } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Nama template wajib diisi" }, { status: 400 });
  }
  if (!body || typeof body !== "string") {
    return NextResponse.json({ error: "Isi pesan wajib diisi" }, { status: 400 });
  }
  const template = createTemplate(name, typeof category === "string" ? category : "", body);
  return NextResponse.json(template, { status: 201 });
}
