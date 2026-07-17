import { NextRequest, NextResponse } from "next/server";
import { getAgentStats, getApiKeyStats, getStats } from "@/lib/messageLog";
import { listTemplates } from "@/lib/templates";
import { listCampaigns } from "@/lib/campaigns";
import { listApiKeys } from "@/lib/apikeys";
import { getCurrentFullUser } from "@/lib/currentUser";
import { getEffectiveTenantId, listTeamMembers } from "@/lib/users";

const ALLOWED_DAYS = [7, 14, 30];

export async function GET(req: NextRequest) {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getEffectiveTenantId(user);

  const requestedDays = Number(req.nextUrl.searchParams.get("days"));
  const days = ALLOWED_DAYS.includes(requestedDays) ? requestedDays : 14;

  const stats = getStats(tenantId, days);
  const templates = listTemplates(tenantId)
    .filter((t) => t.usedCount > 0)
    .sort((a, b) => b.usedCount - a.usedCount)
    .slice(0, 5);
  const campaigns = listCampaigns(tenantId);
  const activeCampaigns = campaigns.filter((c) => c.status === "sending").length;
  const totalCampaigns = campaigns.length;
  const teamMembers = listTeamMembers(tenantId);
  const agentStats =
    teamMembers.length > 1
      ? getAgentStats(tenantId, days).map((a) => ({
          ...a,
          name: teamMembers.find((m) => m.id === a.actorId)?.username ?? "Otomatis",
        }))
      : [];

  const apiKeys = listApiKeys(tenantId);
  const apiKeyStats = getApiKeyStats(tenantId, days).map((s) => ({
    ...s,
    name: s.apiKeyId === "dashboard" ? "Dashboard" : apiKeys.find((k) => k.id === s.apiKeyId)?.name ?? "Key dihapus",
  }));

  return NextResponse.json({
    ...stats,
    periodDays: days,
    topTemplates: templates.map((t) => ({ id: t.id, name: t.name, usedCount: t.usedCount })),
    activeCampaigns,
    totalCampaigns,
    agentStats,
    apiKeyStats,
  });
}
