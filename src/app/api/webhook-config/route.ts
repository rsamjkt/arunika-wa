import { NextRequest, NextResponse } from "next/server";
import { getWebhookConfig, regenerateWebhookSecret, updateWebhookConfig } from "@/lib/webhookConfig";
import { getRecentWebhookDeliveries } from "@/lib/webhookLog";
import { requireFeature } from "@/lib/authz";
import { getEffectiveTenantId } from "@/lib/users";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { isSafeExternalUrl } from "@/lib/urlSafety";

export async function GET() {
  const { user, response } = await requireFeature("webhook");
  if (response) return response;
  const tenantId = getEffectiveTenantId(user!);
  return NextResponse.json({
    ...getWebhookConfig(tenantId),
    recentDeliveries: getRecentWebhookDeliveries(tenantId, 20),
  });
}

export async function PUT(req: NextRequest) {
  const { user, response } = await requireFeature("webhook");
  if (response) return response;

  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { url, events, enabled } = body!;
  // This app fetches `url` server-side on every matching WA event (see
  // webhookConfig.ts::send()) — an unvalidated tenant-supplied URL here is
  // a direct SSRF into this server's own network position, unlike the
  // send-media routes where the URL is merely forwarded to WAHA. Reject
  // anything pointing at a loopback/private/link-local/metadata address.
  if (typeof url === "string" && url.length > 0 && !(await isSafeExternalUrl(url))) {
    return NextResponse.json(
      { error: "URL webhook tidak valid atau menunjuk ke alamat internal" },
      { status: 400 },
    );
  }
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
