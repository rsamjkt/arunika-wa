import { NextRequest, NextResponse } from "next/server";
import { sendOfferBatch } from "@/lib/leadOutreach";
import { requireCronSecret } from "@/lib/cronAuth";

// Small batch per run, throttled further by systemd timer cadence — cold
// WhatsApp outreach at any real volume risks the sending number getting
// flagged/banned, so total daily volume is capped by (batch size × how
// often the timer fires), both tuned conservatively in the timer unit.
const BATCH_SIZE = Number(process.env.LEAD_OUTREACH_BATCH_SIZE ?? "5");

export async function POST(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  const result = await sendOfferBatch(BATCH_SIZE);
  return NextResponse.json({ ok: true, ...result });
}
