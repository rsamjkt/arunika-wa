import { NextRequest, NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/users";

export async function GET() {
  return NextResponse.json(listUsers());
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || typeof username !== "string" || username.trim().length < 3) {
    return NextResponse.json({ error: "Username minimal 3 karakter" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }

  try {
    const user = createUser(username.trim(), password);
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuat user";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
