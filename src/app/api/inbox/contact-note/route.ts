import { NextRequest, NextResponse } from "next/server";
import { requireSessionAccess } from "@/lib/tenancy";
import { getEffectiveTenantId } from "@/lib/users";
import { getContactNote, setContactNote } from "@/lib/contactNotes";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function GET(req: NextRequest) {
  const session = req.nextUrl.searchParams.get("session");
  const contactId = req.nextUrl.searchParams.get("contactId");
  if (!session || !contactId) {
    return NextResponse.json({ error: "session dan contactId wajib diisi" }, { status: 400 });
  }

  const { user, response } = await requireSessionAccess(session);
  if (response) return response;

  return NextResponse.json(getContactNote(getEffectiveTenantId(user!), session, contactId));
}

export async function PUT(req: NextRequest) {
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { session, contactId, tags, note } = body!;
  if (!session || !contactId) {
    return NextResponse.json({ error: "session dan contactId wajib diisi" }, { status: 400 });
  }

  const { user, response } = await requireSessionAccess(session);
  if (response) return response;

  const next = setContactNote(getEffectiveTenantId(user!), session, contactId, {
    tags: Array.isArray(tags) ? tags.filter((t) => typeof t === "string") : undefined,
    note: typeof note === "string" ? note : undefined,
  });
  return NextResponse.json(next);
}
