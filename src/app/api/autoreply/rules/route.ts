import { NextRequest, NextResponse } from "next/server";
import { createRule } from "@/lib/autoreply";
import { requireFeature } from "@/lib/authz";
import { getEffectiveTenantId } from "@/lib/users";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function POST(req: NextRequest) {
  const { user, response } = await requireFeature("autoreply");
  if (response) return response;

  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { keywords, reply } = body!;
  if (!Array.isArray(keywords) || keywords.length === 0 || !keywords.every((k) => typeof k === "string")) {
    return NextResponse.json({ error: "Kata kunci wajib diisi" }, { status: 400 });
  }
  if (!reply || typeof reply !== "string") {
    return NextResponse.json({ error: "Balasan wajib diisi" }, { status: 400 });
  }
  const rule = createRule(
    getEffectiveTenantId(user!),
    keywords.map((k: string) => k.trim()).filter(Boolean),
    reply,
  );
  return NextResponse.json(rule, { status: 201 });
}
