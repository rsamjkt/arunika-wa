import { NextRequest, NextResponse } from "next/server";
import { getWebhookConfig, regenerateWebhookSecret, updateWebhookConfig } from "@/lib/webhookConfig";

export async function GET() {
  return NextResponse.json(getWebhookConfig());
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { url, events, enabled } = body;
  const next = updateWebhookConfig({
    url: typeof url === "string" ? url : undefined,
    events: Array.isArray(events) ? events : undefined,
    enabled: typeof enabled === "boolean" ? enabled : undefined,
  });
  return NextResponse.json(next);
}

export async function POST() {
  const next = regenerateWebhookSecret();
  return NextResponse.json(next);
}
