import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/authz";
import { changePassword, getFullUser } from "@/lib/users";
import { deleteSessionsForUser } from "@/lib/sessions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireSuperadmin();
  if (response) return response;

  const { id } = await params;
  const user = getFullUser(id);
  if (!user || user.role !== "tenant") {
    return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
  }

  const { password } = await req.json();
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }

  changePassword(id, password);
  deleteSessionsForUser(id);
  return NextResponse.json({ ok: true });
}
