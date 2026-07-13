import { NextRequest, NextResponse } from "next/server";
import { getAISettings, updateAISettings } from "@/lib/aiAutoReply";
import { isAIConfigured } from "@/lib/aiClient";
import { requireFeature } from "@/lib/authz";
import { getEffectiveTenantId } from "@/lib/users";

export async function GET() {
  const { user, response } = await requireFeature("autoreply");
  if (response) return response;

  return NextResponse.json({
    ...getAISettings(getEffectiveTenantId(user!)),
    configured: isAIConfigured(),
  });
}

export async function PUT(req: NextRequest) {
  const { user, response } = await requireFeature("autoreply");
  if (response) return response;

  const { enabled, businessName, knowledgeBase, tone } = await req.json();
  const next = updateAISettings(getEffectiveTenantId(user!), {
    enabled: typeof enabled === "boolean" ? enabled : undefined,
    businessName: typeof businessName === "string" ? businessName.slice(0, 120) : undefined,
    knowledgeBase: typeof knowledgeBase === "string" ? knowledgeBase.slice(0, 8000) : undefined,
    tone: typeof tone === "string" ? tone.slice(0, 200) : undefined,
  });
  return NextResponse.json(next);
}
