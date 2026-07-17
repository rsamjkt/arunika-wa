import { NextRequest, NextResponse } from "next/server";
import { getCurrentFullUser } from "@/lib/currentUser";
import { createStaff, listStaffForTenant } from "@/lib/users";
import { parseJsonBody } from "@/lib/parseJsonBody";

// Usernames get rendered into HTML emails (see email.ts's escapeHtml, the
// primary defense) — restricting the charset here too is defense in depth.
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;

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

export async function GET() {
  const { user, response } = await requireOwner();
  if (response) return response;
  return NextResponse.json(listStaffForTenant(user!.id));
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireOwner();
  if (response) return response;

  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { username, password, email } = body!;

  if (!username || typeof username !== "string" || !USERNAME_RE.test(username.trim())) {
    return NextResponse.json(
      { error: "Username 3-30 karakter, hanya huruf, angka, titik, garis bawah, atau strip" },
      { status: 400 },
    );
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }
  if (email && (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
  }

  try {
    const staff = createStaff(user!.id, username.trim(), password, email ? email.trim() : null);
    return NextResponse.json(staff, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuat akun staf";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
