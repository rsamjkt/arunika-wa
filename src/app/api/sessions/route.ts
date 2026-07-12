import { NextRequest, NextResponse } from "next/server";
import { createSession, listSessions, WahaError } from "@/lib/waha";
import { getCurrentFullUser } from "@/lib/currentUser";
import { getPlan } from "@/lib/plans";
import { countOwnedSessions, getOwnedSessionNames, getSessionOwner, recordSessionOwner } from "@/lib/tenancy";
import { getEffectiveTenantId, getGoverningUser } from "@/lib/users";

export async function GET() {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sessions = await listSessions();
    if (user.role === "superadmin") {
      return NextResponse.json(sessions);
    }
    const owned = new Set(getOwnedSessionNames(getEffectiveTenantId(user)));
    return NextResponse.json(sessions.filter((s) => owned.has(s.name)));
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Nama sesi wajib diisi" }, { status: 400 });
  }

  const tenantId = getEffectiveTenantId(user);
  const existingOwner = getSessionOwner(name);
  if (existingOwner && existingOwner !== tenantId) {
    return NextResponse.json({ error: "Nama perangkat ini sudah dipakai" }, { status: 409 });
  }

  if (user.role !== "superadmin" && !existingOwner) {
    const plan = getPlan(getGoverningUser(user).planId);
    const limit = plan?.deviceLimit ?? 1;
    if (countOwnedSessions(tenantId) >= limit) {
      return NextResponse.json(
        { error: `Paket Anda hanya mengizinkan ${limit} perangkat. Upgrade paket untuk menambah perangkat.` },
        { status: 403 },
      );
    }
  }

  try {
    const session = await createSession(name);
    if (!existingOwner) recordSessionOwner(name, tenantId);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
