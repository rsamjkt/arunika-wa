import { NextResponse } from "next/server";
import { getCurrentFullUser } from "@/lib/currentUser";
import { getReferralCode } from "@/lib/users";
import { listReferralsFor } from "@/lib/referrals";

export async function GET() {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "tenant") {
    return NextResponse.json({ error: "Hanya pemilik akun yang punya kode referral" }, { status: 403 });
  }

  return NextResponse.json({
    code: getReferralCode(user),
    referrals: listReferralsFor(user.id),
  });
}
