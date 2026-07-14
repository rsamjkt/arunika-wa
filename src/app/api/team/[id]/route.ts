import { NextRequest, NextResponse } from "next/server";
import { getCurrentFullUser } from "@/lib/currentUser";
import { changePassword, deleteStaff, listStaffForTenant } from "@/lib/users";
import { deleteSessionsForUser } from "@/lib/sessions";
import { deleteNotificationsForUser } from "@/lib/notifications";
import { parseJsonBody } from "@/lib/parseJsonBody";

async function requireOwner() {
  const user = await getCurrentFullUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (user.role !== "tenant") {
    return { user, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, response: null };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireOwner();
  if (response) return response;

  const { id } = await params;
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { password } = body!;

  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }
  if (!listStaffForTenant(user!.id).some((s) => s.id === id)) {
    return NextResponse.json({ error: "Staf tidak ditemukan" }, { status: 404 });
  }

  try {
    changePassword(id, password);
    deleteSessionsForUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengubah password";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireOwner();
  if (response) return response;

  const { id } = await params;

  try {
    deleteStaff(user!.id, id);
    deleteSessionsForUser(id);
    deleteNotificationsForUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghapus staf";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
