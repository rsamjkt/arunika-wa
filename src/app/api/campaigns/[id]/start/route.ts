import { NextResponse } from "next/server";
import { getCampaign, startCampaign } from "@/lib/campaigns";
import { requireFeature } from "@/lib/authz";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireFeature("broadcast");
  if (response) return response;

  const { id } = await params;
  const campaign = getCampaign(user!.id, id);
  if (!campaign) return NextResponse.json({ error: "Campaign tidak ditemukan" }, { status: 404 });
  startCampaign(user!.id, id);
  return NextResponse.json({ ok: true });
}
