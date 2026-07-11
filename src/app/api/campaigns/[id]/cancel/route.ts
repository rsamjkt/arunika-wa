import { NextResponse } from "next/server";
import { cancelCampaign, getCampaign } from "@/lib/campaigns";
import { getCurrentFullUser } from "@/lib/currentUser";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = getCampaign(user.id, id);
  if (!campaign) return NextResponse.json({ error: "Campaign tidak ditemukan" }, { status: 404 });
  cancelCampaign(user.id, id);
  return NextResponse.json({ ok: true });
}
