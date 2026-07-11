import { NextResponse } from "next/server";
import { testOutboundWebhook } from "@/lib/webhookConfig";
import { getCurrentFullUser } from "@/lib/currentUser";

export async function POST() {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await testOutboundWebhook(user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Gagal mengirim test webhook" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
