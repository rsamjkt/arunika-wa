import { NextRequest, NextResponse } from "next/server";
import { createTemplate, listTemplates } from "@/lib/templates";
import { getCurrentFullUser } from "@/lib/currentUser";

export async function GET() {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(listTemplates(user.id));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, category, body } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Nama template wajib diisi" }, { status: 400 });
  }
  if (!body || typeof body !== "string") {
    return NextResponse.json({ error: "Isi pesan wajib diisi" }, { status: 400 });
  }
  const template = createTemplate(user.id, name, typeof category === "string" ? category : "", body);
  return NextResponse.json(template, { status: 201 });
}
