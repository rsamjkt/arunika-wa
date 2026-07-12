import { NextRequest, NextResponse } from "next/server";
import { listDueCampaigns, startCampaign } from "@/lib/campaigns";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = listDueCampaigns();
  for (const c of due) {
    startCampaign(c.ownerId, c.id);
  }

  return NextResponse.json({ ok: true, started: due.length });
}
