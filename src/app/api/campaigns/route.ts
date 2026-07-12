import { NextRequest, NextResponse } from "next/server";
import { createCampaign, listCampaigns, startCampaign } from "@/lib/campaigns";
import { requireFeature } from "@/lib/authz";
import { getEffectiveTenantId } from "@/lib/users";
import { requireSessionAccess } from "@/lib/tenancy";

export async function GET() {
  const { user, response } = await requireFeature("broadcast");
  if (response) return response;
  return NextResponse.json(listCampaigns(getEffectiveTenantId(user!)));
}

export async function POST(req: NextRequest) {
  const { response: featureResponse } = await requireFeature("broadcast");
  if (featureResponse) return featureResponse;

  const { name, session, messageBody, templateId, recipients, startNow } = await req.json();

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Nama campaign wajib diisi" }, { status: 400 });
  }
  if (!session || typeof session !== "string") {
    return NextResponse.json({ error: "Perangkat pengirim wajib dipilih" }, { status: 400 });
  }
  if (!messageBody || typeof messageBody !== "string") {
    return NextResponse.json({ error: "Isi pesan wajib diisi" }, { status: 400 });
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: "Audiens tidak boleh kosong" }, { status: 400 });
  }

  const { user, response } = await requireSessionAccess(session);
  if (response) return response;

  const campaign = createCampaign(
    getEffectiveTenantId(user!),
    name,
    session,
    messageBody,
    recipients,
    typeof templateId === "string" ? templateId : undefined,
  );

  if (startNow) startCampaign(getEffectiveTenantId(user!), campaign.id);

  return NextResponse.json(campaign, { status: 201 });
}
