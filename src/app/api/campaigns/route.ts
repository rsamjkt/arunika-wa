import { NextRequest, NextResponse } from "next/server";
import { createCampaign, listCampaigns, startCampaign } from "@/lib/campaigns";
import { requireFeature } from "@/lib/authz";
import { getEffectiveTenantId } from "@/lib/users";
import { requireSessionAccess } from "@/lib/tenancy";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function GET() {
  const { user, response } = await requireFeature("broadcast");
  if (response) return response;
  return NextResponse.json(listCampaigns(getEffectiveTenantId(user!)));
}

export async function POST(req: NextRequest) {
  const { response: featureResponse } = await requireFeature("broadcast");
  if (featureResponse) return featureResponse;

  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { name, session, messageBody, templateId, recipients, startNow, scheduledAt } = body!;

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
  // Bounds the worst-case synchronous write in createCampaign() (store.ts
  // does a blocking JSON.stringify + fs.writeFileSync) — no legitimate
  // broadcast needs more than this per campaign, and quota/plan limits
  // already cap actual sends far below it anyway.
  const MAX_RECIPIENTS = 20_000;
  if (recipients.length > MAX_RECIPIENTS) {
    return NextResponse.json(
      { error: `Maksimal ${MAX_RECIPIENTS.toLocaleString("id-ID")} penerima per campaign` },
      { status: 400 },
    );
  }
  let scheduledAtIso: string | null = null;
  if (typeof scheduledAt === "string" && scheduledAt) {
    const parsed = new Date(scheduledAt);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Waktu jadwal harus di masa depan" }, { status: 400 });
    }
    scheduledAtIso = parsed.toISOString();
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
    scheduledAtIso,
  );

  if (startNow && !scheduledAtIso) startCampaign(getEffectiveTenantId(user!), campaign.id);

  return NextResponse.json(campaign, { status: 201 });
}
