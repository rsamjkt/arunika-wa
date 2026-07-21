import { NextRequest, NextResponse } from "next/server";
import { createSession, listSessions, WahaError } from "@/lib/waha";
import { getCurrentFullUser } from "@/lib/currentUser";
import { getEffectivePlan } from "@/lib/authz";
import {
  countOwnedSessions,
  getOwnedSessionNames,
  getSessionOwner,
  recordSessionOwner,
  releaseSessionOwner,
} from "@/lib/tenancy";
import { getEffectiveTenantId } from "@/lib/users";
import { parseJsonBody } from "@/lib/parseJsonBody";

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

  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { name } = body!;
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Nama sesi wajib diisi" }, { status: 400 });
  }

  const tenantId = getEffectiveTenantId(user);
  const existingOwner = getSessionOwner(name);
  if (existingOwner && existingOwner !== tenantId) {
    return NextResponse.json({ error: "Nama perangkat ini sudah dipakai" }, { status: 409 });
  }

  if (user.role !== "superadmin" && !existingOwner) {
    const plan = getEffectivePlan(user);
    const limit = plan.deviceLimit;
    if (countOwnedSessions(tenantId) >= limit) {
      return NextResponse.json(
        { error: `Paket Anda hanya mengizinkan ${limit} perangkat. Upgrade paket untuk menambah perangkat.` },
        { status: 403 },
      );
    }
  }

  // Reserve ownership synchronously, BEFORE the async WAHA round-trip
  // below — reading `getSessionOwner` and writing `recordSessionOwner`
  // with no `await` in between means Node can't interleave a second
  // concurrent request for the same `name` in the middle of this check.
  // The previous version recorded ownership only *after* `await
  // createSession(name)` returned, leaving a window where two tenants
  // racing to claim the same session name could both pass the ownership
  // check before either recorded it, and whichever write landed last
  // silently hijacked the session from the other tenant (see security
  // audit finding — TOCTOU session-name race).
  const wasAlreadyOwned = !!existingOwner;
  if (!wasAlreadyOwned) recordSessionOwner(name, tenantId);

  try {
    const session = await createSession(name);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    if (!wasAlreadyOwned) releaseSessionOwner(name);
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
