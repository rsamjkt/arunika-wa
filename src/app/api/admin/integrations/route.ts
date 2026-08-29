import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/authz";
import { getCurrentFullUser } from "@/lib/currentUser";
import { getEffectiveTenantId } from "@/lib/users";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { getAppUrl } from "@/lib/appUrl";
import { getTelegramConfig, isTelegramConfigured, maskedTelegramToken, setTelegramConfig, setTelegramWebhook } from "@/lib/telegram";
import { getShippingKey, isShippingConfigured, maskedShippingKey, setShippingKey } from "@/lib/shipping";
import { isWebSearchConfigured, maskedTavilyKey, setTavilyKey } from "@/lib/webSearch";
import { TOOLS } from "@/lib/aiTools";

export async function GET() {
  const { response } = await requireSuperadmin();
  if (response) return response;
  const tg = getTelegramConfig();
  return NextResponse.json({
    telegram: { configured: isTelegramConfigured(), maskedToken: maskedTelegramToken(), ownerId: tg.ownerId ?? null, hasSecret: !!tg.webhookSecret, webhookUrl: `${getAppUrl()}/api/webhooks/telegram` },
    shipping: { configured: isShippingConfigured(), masked: maskedShippingKey() },
    webSearch: { configured: isWebSearchConfigured(), masked: maskedTavilyKey() },
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
  });
}

export async function PUT(req: NextRequest) {
  const { response } = await requireSuperadmin();
  if (response) return response;
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { kind, apiKey, botToken, ownerId, webhookSecret } = body!;

  if (kind === "shipping") {
    if (typeof apiKey === "string" && apiKey.trim()) setShippingKey(apiKey);
  } else if (kind === "websearch") {
    if (typeof apiKey === "string" && apiKey.trim()) setTavilyKey(apiKey);
  } else if (kind === "telegram") {
    const user = await getCurrentFullUser();
    const patch: Record<string, string> = {};
    if (typeof botToken === "string" && botToken.trim()) patch.botToken = botToken.trim();
    if (typeof webhookSecret === "string") patch.webhookSecret = webhookSecret.trim();
    patch.ownerId = typeof ownerId === "string" && ownerId.trim() ? ownerId.trim() : (user ? getEffectiveTenantId(user) : "");
    setTelegramConfig(patch);
  } else {
    return NextResponse.json({ error: "Integrasi tidak dikenal" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const { response } = await requireSuperadmin();
  if (response) return response;
  const { body } = await parseJsonBody(req);
  if (body?.action === "connect-telegram") {
    const result = await setTelegramWebhook(getAppUrl());
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
}
