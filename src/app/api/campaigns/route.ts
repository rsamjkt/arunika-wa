import { NextRequest, NextResponse } from "next/server";
import { createCampaign, listCampaigns, startCampaign } from "@/lib/campaigns";

export async function GET() {
  return NextResponse.json(listCampaigns());
}

export async function POST(req: NextRequest) {
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

  const campaign = createCampaign(
    name,
    session,
    messageBody,
    recipients,
    typeof templateId === "string" ? templateId : undefined,
  );

  if (startNow) startCampaign(campaign.id);

  return NextResponse.json(campaign, { status: 201 });
}
