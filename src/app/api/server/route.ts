import { NextResponse } from "next/server";
import { getServerStatus, getServerVersion, WahaError } from "@/lib/waha";

export async function GET() {
  try {
    const [status, version] = await Promise.all([
      getServerStatus().catch(() => null),
      getServerVersion().catch(() => null),
    ]);
    return NextResponse.json({ status, version });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
