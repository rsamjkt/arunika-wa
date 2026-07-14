import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/authz";
import { AI_PROVIDER_LABELS, AI_PROVIDERS, type AIProvider } from "@/lib/aiAutoReply";
import {
  clearProviderKey,
  DEFAULT_BASE_URLS,
  getProviderBaseUrl,
  isProviderConfigured,
  maskedKeyHint,
  setProviderBaseUrl,
  setProviderKey,
} from "@/lib/aiProviderKeys";
import { parseJsonBody } from "@/lib/parseJsonBody";

function isValidProvider(provider: unknown): provider is AIProvider {
  return typeof provider === "string" && (AI_PROVIDERS as string[]).includes(provider);
}

export async function GET() {
  const { response } = await requireSuperadmin();
  if (response) return response;

  return NextResponse.json(
    AI_PROVIDERS.map((provider) => ({
      provider,
      label: AI_PROVIDER_LABELS[provider],
      configured: isProviderConfigured(provider),
      maskedHint: maskedKeyHint(provider),
      baseUrl: getProviderBaseUrl(provider),
      defaultBaseUrl: DEFAULT_BASE_URLS[provider],
    })),
  );
}

export async function PUT(req: NextRequest) {
  const { response } = await requireSuperadmin();
  if (response) return response;

  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { provider, apiKey, baseUrl } = body!;

  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Provider tidak valid" }, { status: 400 });
  }
  if (baseUrl !== undefined && typeof baseUrl !== "string") {
    return NextResponse.json({ error: "Base URL tidak valid" }, { status: 400 });
  }

  const hasNewKey = typeof apiKey === "string" && apiKey.trim().length > 0;
  const hasNewUrl = typeof baseUrl === "string" && baseUrl.trim().length > 0;

  if (!hasNewKey && !hasNewUrl) {
    return NextResponse.json({ error: "Isi API key atau Base URL" }, { status: 400 });
  }

  if (hasNewKey) {
    setProviderKey(provider, apiKey.trim(), hasNewUrl ? baseUrl : undefined);
  } else if (hasNewUrl) {
    setProviderBaseUrl(provider, baseUrl);
  }

  return NextResponse.json({ ok: true, maskedHint: maskedKeyHint(provider), baseUrl: getProviderBaseUrl(provider) });
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireSuperadmin();
  if (response) return response;

  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { provider } = body!;

  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Provider tidak valid" }, { status: 400 });
  }

  clearProviderKey(provider);
  return NextResponse.json({ ok: true });
}
