import { NextRequest, NextResponse } from "next/server";
import { createRule } from "@/lib/autoreply";
import { requireFeature } from "@/lib/authz";

export async function POST(req: NextRequest) {
  const { user, response } = await requireFeature("autoreply");
  if (response) return response;

  const { keywords, reply } = await req.json();
  if (!Array.isArray(keywords) || keywords.length === 0 || !keywords.every((k) => typeof k === "string")) {
    return NextResponse.json({ error: "Kata kunci wajib diisi" }, { status: 400 });
  }
  if (!reply || typeof reply !== "string") {
    return NextResponse.json({ error: "Balasan wajib diisi" }, { status: 400 });
  }
  const rule = createRule(
    user!.id,
    keywords.map((k: string) => k.trim()).filter(Boolean),
    reply,
  );
  return NextResponse.json(rule, { status: 201 });
}
