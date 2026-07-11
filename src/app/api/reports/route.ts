import { NextResponse } from "next/server";
import { getStats } from "@/lib/messageLog";
import { listTemplates } from "@/lib/templates";
import { listCampaigns } from "@/lib/campaigns";
import { getCurrentFullUser } from "@/lib/currentUser";

export async function GET() {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stats = getStats(user.id, 14);
  const templates = listTemplates(user.id)
    .filter((t) => t.usedCount > 0)
    .sort((a, b) => b.usedCount - a.usedCount)
    .slice(0, 5);
  const campaigns = listCampaigns(user.id);
  const activeCampaigns = campaigns.filter((c) => c.status === "sending").length;
  const totalCampaigns = campaigns.length;

  return NextResponse.json({
    ...stats,
    topTemplates: templates.map((t) => ({ id: t.id, name: t.name, usedCount: t.usedCount })),
    activeCampaigns,
    totalCampaigns,
  });
}
