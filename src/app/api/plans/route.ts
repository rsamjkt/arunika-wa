import { NextRequest, NextResponse } from "next/server";
import { createPlan, listPlans } from "@/lib/plans";
import { requireSuperadmin } from "@/lib/authz";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function GET() {
  return NextResponse.json(listPlans());
}

export async function POST(req: NextRequest) {
  const { response } = await requireSuperadmin();
  if (response) return response;

  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { name, priceRp, durationDays, deviceLimit, monthlyMessageQuota, features } = body!;
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Nama paket wajib diisi" }, { status: 400 });
  }
  if (typeof priceRp !== "number" || priceRp < 0) {
    return NextResponse.json({ error: "Harga tidak valid" }, { status: 400 });
  }
  if (typeof deviceLimit !== "number" || deviceLimit < 1) {
    return NextResponse.json({ error: "Batas perangkat tidak valid" }, { status: 400 });
  }

  const plan = createPlan({
    name,
    priceRp,
    durationDays: priceRp === 0 ? null : typeof durationDays === "number" ? durationDays : 30,
    deviceLimit,
    monthlyMessageQuota: typeof monthlyMessageQuota === "number" ? monthlyMessageQuota : null,
    features: Array.isArray(features) ? features : [],
  });
  return NextResponse.json(plan, { status: 201 });
}
