import { NextRequest, NextResponse } from "next/server";
import { listDueCampaigns, startCampaign } from "@/lib/campaigns";
import { requireCronSecret } from "@/lib/cronAuth";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const due = listDueCampaigns();
  for (const c of due) {
    startCampaign(c.ownerId, c.id);
  }

  return NextResponse.json({ ok: true, started: due.length });
}
