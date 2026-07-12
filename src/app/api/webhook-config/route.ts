import { NextRequest, NextResponse } from "next/server";
import { getWebhookConfig, regenerateWebhookSecret, updateWebhookConfig } from "@/lib/webhookConfig";
import { requireFeature } from "@/lib/authz";
import { getEffectiveTenantId } from "@/lib/users";

export async function GET() {
  const { user, response } = await requireFeature("webhook");
  if (response) return response;
  return NextResponse.json(getWebhookConfig(getEffectiveTenantId(user!)));
}

export async function PUT(req: NextRequest) {
  const { user, response } = await requireFeature("webhook");
  if (response) return response;

  const body = await req.json();
  const { url, events, enabled } = body;
  const next = updateWebhookConfig(getEffectiveTenantId(user!), {
    url: typeof url === "string" ? url : undefined,
    events: Array.isArray(events) ? events : undefined,
    enabled: typeof enabled === "boolean" ? enabled : undefined,
  });
  return NextResponse.json(next);
}

export async function POST() {
  const { user, response } = await requireFeature("webhook");
  if (response) return response;

  const next = regenerateWebhookSecret(getEffectiveTenantId(user!));
  return NextResponse.json(next);
}
