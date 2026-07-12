import { NextRequest, NextResponse } from "next/server";
import { downgradeToFree, listExpiredSubscriptions, listSubscriptionsExpiringSoon } from "@/lib/users";
import { getPlan } from "@/lib/plans";
import { sendEmail, subscriptionExpiringEmail } from "@/lib/email";
import { hasBeenReminded, markReminded } from "@/lib/reminders";

const REMINDER_WINDOW_DAYS = 3;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = listExpiredSubscriptions();
  for (const user of expired) {
    downgradeToFree(user.id);
  }

  const expiringSoon = listSubscriptionsExpiringSoon(REMINDER_WINDOW_DAYS);
  let reminded = 0;
  for (const user of expiringSoon) {
    const key = `${user.id}:${user.subscriptionExpiresAt}`;
    if (hasBeenReminded(key)) continue;
    if (!user.email) continue;
    const plan = getPlan(user.planId);
    if (!plan) continue;
    const { subject, html } = subscriptionExpiringEmail(user.username, plan.name, user.subscriptionExpiresAt!);
    await sendEmail(user.email, subject, html);
    markReminded(key);
    reminded++;
  }

  return NextResponse.json({ ok: true, downgraded: expired.length, reminded });
}
