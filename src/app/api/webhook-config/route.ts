import { NextRequest, NextResponse } from "next/server";
import { getWebhookConfig, regenerateWebhookSecret, updateWebhookConfig } from "@/lib/webhookConfig";
import { requireFeature } from "@/lib/authz";

export async function GET() {
  const { user, response } = await requireFeature("webhook");
  if (response) return response;
  return NextResponse.json(getWebhookConfig(user!.id));
}

export async function PUT(req: NextRequest) {
  const { user, response } = await requireFeature("webhook");
  if (response) return response;

  const body = await req.json();
  const { url, events, enabled } = body;
  const next = updateWebhookConfig(user!.id, {
    url: typeof url === "string" ? url : undefined,
    events: Array.isArray(events) ? events : undefined,
    enabled: typeof enabled === "boolean" ? enabled : undefined,
  });
  return NextResponse.json(next);
}

export async function POST() {
  const { user, response } = await requireFeature("webhook");
  if (response) return response;

  const next = regenerateWebhookSecret(user!.id);
  return NextResponse.json(next);
}
