import { NextRequest, NextResponse } from "next/server";
import { deletePlan, updatePlan } from "@/lib/plans";
import { requireSuperadmin } from "@/lib/authz";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireSuperadmin();
  if (response) return response;

  const { id } = await params;
  const { name, priceRp, durationDays, deviceLimit, monthlyMessageQuota, features } = await req.json();
  updatePlan(id, {
    name: typeof name === "string" ? name : undefined,
    priceRp: typeof priceRp === "number" ? priceRp : undefined,
    durationDays: durationDays === null || typeof durationDays === "number" ? durationDays : undefined,
    deviceLimit: typeof deviceLimit === "number" ? deviceLimit : undefined,
    monthlyMessageQuota:
      monthlyMessageQuota === null || typeof monthlyMessageQuota === "number" ? monthlyMessageQuota : undefined,
    features: Array.isArray(features) ? features : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireSuperadmin();
  if (response) return response;

  const { id } = await params;
  try {
    deletePlan(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal menghapus" }, { status: 409 });
  }
}
