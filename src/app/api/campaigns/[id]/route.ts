import { NextResponse } from "next/server";
import { getCampaign } from "@/lib/campaigns";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = getCampaign(id);
  if (!campaign) return NextResponse.json({ error: "Campaign tidak ditemukan" }, { status: 404 });
  return NextResponse.json(campaign);
}
