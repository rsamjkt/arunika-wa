import { NextRequest, NextResponse } from "next/server";
import { AI_MODELS, getAISettings, isValidAIModel, updateAISettings } from "@/lib/aiAutoReply";
import { isAIConfigured, isModelConfigured } from "@/lib/aiClient";
import { requireFeature } from "@/lib/authz";
import { getEffectiveTenantId } from "@/lib/users";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function GET() {
  const { user, response } = await requireFeature("ai_autoreply");
  if (response) return response;

  const settings = getAISettings(getEffectiveTenantId(user!));
  return NextResponse.json({
    ...settings,
    configured: isAIConfigured(),
    modelConfigured: isModelConfigured(settings.model),
    availableModels: AI_MODELS.map((m) => ({ ...m, configured: isModelConfigured(m.id) })),
  });
}

export async function PUT(req: NextRequest) {
  const { user, response } = await requireFeature("ai_autoreply");
  if (response) return response;

  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { enabled, businessName, knowledgeBase, tone, model } = body!;
  if (model !== undefined && !isValidAIModel(model)) {
    return NextResponse.json({ error: "Model AI tidak valid" }, { status: 400 });
  }
  const next = updateAISettings(getEffectiveTenantId(user!), {
    enabled: typeof enabled === "boolean" ? enabled : undefined,
    businessName: typeof businessName === "string" ? businessName.slice(0, 120) : undefined,
    knowledgeBase: typeof knowledgeBase === "string" ? knowledgeBase.slice(0, 8000) : undefined,
    tone: typeof tone === "string" ? tone.slice(0, 200) : undefined,
    model: isValidAIModel(model) ? model : undefined,
  });
  return NextResponse.json(next);
}
