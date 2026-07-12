import { NextResponse } from "next/server";
import { testOutboundWebhook } from "@/lib/webhookConfig";
import { requireFeature } from "@/lib/authz";
import { getEffectiveTenantId } from "@/lib/users";

export async function POST() {
  const { user, response } = await requireFeature("webhook");
  if (response) return response;

  const result = await testOutboundWebhook(getEffectiveTenantId(user!));
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Gagal mengirim test webhook" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
