import { NextResponse } from "next/server";
import { getCurrentFullUser } from "@/lib/currentUser";
import { getEffectiveTenantId } from "@/lib/users";
import { getOwnedSessionNames } from "@/lib/tenancy";
import { healthAndWarmupBatch } from "@/lib/numberHealth";

// Ringan: satu kali baca message-log untuk semua session. Hanya dashboard yang
// memanggil ini (bukan inbox/grup) sehingga tak membebani polling yang sering.
export async function GET() {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const names = user.role === "superadmin" ? undefined : getOwnedSessionNames(getEffectiveTenantId(user));
  return NextResponse.json(healthAndWarmupBatch(names));
}
