import { NextRequest, NextResponse } from "next/server";
import { createApiKey, listApiKeys } from "@/lib/apikeys";
import { requireFeature } from "@/lib/authz";
import { getEffectiveTenantId } from "@/lib/users";
import { getApiKeyStats } from "@/lib/messageLog";
import { parseJsonBody } from "@/lib/parseJsonBody";

const ALL_TIME_DAYS = 3650;

export async function GET() {
  const { user, response } = await requireFeature("apikeys");
  if (response) return response;
  const tenantId = getEffectiveTenantId(user!);

  const keys = listApiKeys(tenantId);
  const usage = getApiKeyStats(tenantId, ALL_TIME_DAYS);
  return NextResponse.json(
    keys.map((k) => {
      const stat = usage.find((u) => u.apiKeyId === k.id);
      return { ...k, sentCount: stat?.sent ?? 0, failedCount: stat?.failed ?? 0 };
    }),
  );
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireFeature("apikeys");
  if (response) return response;

  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { name } = body!;
  const record = createApiKey(getEffectiveTenantId(user!), typeof name === "string" ? name : "");
  return NextResponse.json(record, { status: 201 });
}
