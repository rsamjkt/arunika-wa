import { NextResponse } from "next/server";
import { getCampaign } from "@/lib/campaigns";
import { requireFeature } from "@/lib/authz";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireFeature("broadcast");
  if (response) return response;

  const { id } = await params;
  const campaign = getCampaign(user!.id, id);
  if (!campaign) return NextResponse.json({ error: "Campaign tidak ditemukan" }, { status: 404 });
  return NextResponse.json(campaign);
}
