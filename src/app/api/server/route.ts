import { NextResponse } from "next/server";
import { getServerStatus, getServerVersion, WahaError } from "@/lib/waha";
import { requireSuperadmin } from "@/lib/authz";

export async function GET() {
  // Exposes the underlying WA engine's name/version — must never reach a
  // tenant (see project convention: never show "WAHA" to tenants). The
  // dashboard already hides this in the UI for non-superadmins, but that's
  // a client-side check only; without this, any logged-in tenant could
  // still curl the API directly and get it.
  const { response } = await requireSuperadmin();
  if (response) return response;

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
