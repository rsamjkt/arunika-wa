import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/** Shared guard for the systemd-timer-triggered cron endpoints
 * (downgrade-expired, run-scheduled-campaigns, lead-outreach) — all three
 * previously duplicated a plain `!==` comparison against CRON_SECRET,
 * inconsistent with the timing-safe comparison used everywhere else in
 * this codebase for secret checks (API keys, session tokens, webhook
 * signatures). Fails closed if CRON_SECRET is unset. */
export function requireCronSecret(req: NextRequest): NextResponse | null {
  const provided = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!provided || !expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const bufA = Buffer.from(provided);
  const bufB = Buffer.from(expected);
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
