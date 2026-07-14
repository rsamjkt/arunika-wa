import { NextRequest, NextResponse } from "next/server";
import { changePassword, deleteUser } from "@/lib/users";
import { deleteSessionsForUser } from "@/lib/sessions";
import { getCurrentUser } from "@/lib/currentUser";
import { requireSuperadmin } from "@/lib/authz";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireSuperadmin();
  if (response) return response;

  const { id } = await params;
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { password } = body!;

  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireSuperadmin();
  if (response) return response;

  const { id } = await params;

  const current = await getCurrentUser();
  if (current?.userId === id) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun yang sedang login" }, { status: 400 });
  }

  try {
    deleteUser(id);
    deleteSessionsForUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghapus user";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
