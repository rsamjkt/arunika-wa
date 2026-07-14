import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/authz";
import { AI_PROVIDER_LABELS, AI_PROVIDERS, type AIProvider } from "@/lib/aiAutoReply";
import { clearProviderKey, isProviderConfigured, maskedKeyHint, setProviderKey } from "@/lib/aiProviderKeys";
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
    })),
  );
}

export async function PUT(req: NextRequest) {
  const { response } = await requireSuperadmin();
  if (response) return response;

  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { provider, apiKey } = body!;

  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Provider tidak valid" }, { status: 400 });
  }
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return NextResponse.json({ error: "API key wajib diisi" }, { status: 400 });
  }

  setProviderKey(provider, apiKey.trim());
  return NextResponse.json({ ok: true, maskedHint: maskedKeyHint(provider) });
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
