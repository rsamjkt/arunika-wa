import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/authz";
import {
  activateSubscription,
  deleteStaff,
  deleteUser,
  getEffectiveQuotaUsage,
  getFullUser,
  listStaffForTenant,
  reactivateUser,
  suspendUser,
} from "@/lib/users";
import { getPlan } from "@/lib/plans";
import { getOwnedSessionNames, releaseSessionOwner } from "@/lib/tenancy";
import { deleteSession as deleteWahaSession, listSessions } from "@/lib/waha";
import { deleteSessionsForUser } from "@/lib/sessions";
import { listTransactionsForUser } from "@/lib/transactions";
import { deleteAllForOwner as deleteTemplatesForOwner } from "@/lib/templates";
import { deleteAllForOwner as deleteCampaignsForOwner } from "@/lib/campaigns";
import { deleteAllForOwner as deleteApiKeysForOwner } from "@/lib/apikeys";
import { deleteSettingsForOwner } from "@/lib/autoreply";
import { deleteConfigForOwner } from "@/lib/webhookConfig";
import { deleteWebhookLogForOwner } from "@/lib/webhookLog";
import { deleteReferralsForOwner } from "@/lib/referrals";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { response } = await requireSuperadmin();
  if (response) return response;

  const { id } = await params;
  const user = getFullUser(id);
  if (!user || user.role !== "tenant") {
    return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
  }

  const ownedNames = new Set(getOwnedSessionNames(id));
  let sessions: { name: string; status: string }[] = [];
  try {
    const all = await listSessions();
    sessions = all.filter((s) => ownedNames.has(s.name)).map((s) => ({ name: s.name, status: s.status }));
  } catch {
    sessions = [...ownedNames].map((name) => ({ name, status: "UNKNOWN" }));
  }

  return NextResponse.json({
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    createdAt: user.createdAt,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
    suspended: user.suspended,
    plan: getPlan(user.planId),
    usage: { messagesSent: getEffectiveQuotaUsage(id), devices: ownedNames.size },
    staff: listStaffForTenant(id),
    sessions,
    transactions: listTransactionsForUser(id).slice(0, 10),
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { response } = await requireSuperadmin();
  if (response) return response;

  const { id } = await params;
  const user = getFullUser(id);
  if (!user || user.role !== "tenant") {
    return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
  }

  const { planId, subscriptionExpiresAt, suspended } = await req.json();

  if (typeof planId === "string") {
    const plan = getPlan(planId);
    if (!plan) return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 400 });
    const expiresAt =
      subscriptionExpiresAt === null || typeof subscriptionExpiresAt === "string" ? subscriptionExpiresAt : null;
    activateSubscription(id, plan.id, expiresAt);
  }

  if (typeof suspended === "boolean") {
    if (suspended) {
      suspendUser(id);
      deleteSessionsForUser(id);
      for (const staff of listStaffForTenant(id)) {
        deleteSessionsForUser(staff.id);
      }
    } else {
      reactivateUser(id);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { response } = await requireSuperadmin();
  if (response) return response;

  const { id } = await params;
  const user = getFullUser(id);
  if (!user || user.role !== "tenant") {
    return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
  }

  const staff = listStaffForTenant(id);

  for (const name of getOwnedSessionNames(id)) {
    try {
      await deleteWahaSession(name);
    } catch {
      // Best-effort — an unreachable WAHA engine or already-gone session
      // shouldn't block account deletion; the owner record is released below.
    }
    releaseSessionOwner(name);
  }

  deleteTemplatesForOwner(id);
  deleteCampaignsForOwner(id);
  deleteApiKeysForOwner(id);
  deleteSettingsForOwner(id);
  deleteConfigForOwner(id);
  deleteWebhookLogForOwner(id);
  deleteReferralsForOwner(id);

  for (const s of staff) {
    deleteStaff(id, s.id);
    deleteSessionsForUser(s.id);
  }

  deleteSessionsForUser(id);
  deleteUser(id);

  return NextResponse.json({ ok: true });
}
