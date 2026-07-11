import { NextRequest, NextResponse } from "next/server";
import { downgradeToFree, listExpiredSubscriptions } from "@/lib/users";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = listExpiredSubscriptions();
  for (const user of expired) {
    downgradeToFree(user.id);
  }

  return NextResponse.json({ ok: true, downgraded: expired.length });
}
