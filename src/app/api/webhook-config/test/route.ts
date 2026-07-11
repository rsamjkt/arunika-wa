import { NextResponse } from "next/server";
import { testOutboundWebhook } from "@/lib/webhookConfig";

export async function POST() {
  const result = await testOutboundWebhook();
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Gagal mengirim test webhook" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
