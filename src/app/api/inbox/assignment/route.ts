import { NextRequest, NextResponse } from "next/server";
import { requireSessionAccess } from "@/lib/tenancy";
import { getEffectiveTenantId, listTeamMembers } from "@/lib/users";
import { listAssignmentsForSession, setAssignment } from "@/lib/chatAssignments";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function GET(req: NextRequest) {
  const session = req.nextUrl.searchParams.get("session");
  if (!session) return NextResponse.json({ error: "session wajib diisi" }, { status: 400 });

  const { user, response } = await requireSessionAccess(session);
  if (response) return response;

  const tenantId = getEffectiveTenantId(user!);
  return NextResponse.json({
    assignments: listAssignmentsForSession(tenantId, session),
    teamMembers: listTeamMembers(tenantId),
  });
}

export async function PUT(req: NextRequest) {
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { session, chatId, assignedTo, status } = body!;
  if (!session || !chatId) {
    return NextResponse.json({ error: "session dan chatId wajib diisi" }, { status: 400 });
  }
  if (status !== undefined && status !== "open" && status !== "resolved") {
    return NextResponse.json({ error: "status tidak valid" }, { status: 400 });
  }

  const { user, response } = await requireSessionAccess(session);
  if (response) return response;

  const tenantId = getEffectiveTenantId(user!);
  if (typeof assignedTo === "string" && assignedTo) {
    const valid = listTeamMembers(tenantId).some((m) => m.id === assignedTo);
    if (!valid) return NextResponse.json({ error: "Anggota tim tidak ditemukan" }, { status: 400 });
  }

  const next = setAssignment(tenantId, session, chatId, {
    assignedTo: assignedTo === null ? null : typeof assignedTo === "string" ? assignedTo : undefined,
    status: status === "open" || status === "resolved" ? status : undefined,
  });
  return NextResponse.json(next);
}
