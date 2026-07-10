import { NextRequest, NextResponse } from "next/server";
import { createSession, listSessions, WahaError } from "@/lib/waha";

export async function GET() {
  try {
    const sessions = await listSessions();
    return NextResponse.json(sessions);
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Nama sesi wajib diisi" },
        { status: 400 },
      );
    }
    const session = await createSession(name);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
