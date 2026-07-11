import { NextResponse } from "next/server";
import { getCampaign, startCampaign } from "@/lib/campaigns";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = getCampaign(id);
  if (!campaign) return NextResponse.json({ error: "Campaign tidak ditemukan" }, { status: 404 });
  startCampaign(id);
  return NextResponse.json({ ok: true });
}
