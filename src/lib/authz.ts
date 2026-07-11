import { NextResponse } from "next/server";
import { getCurrentFullUser } from "./currentUser";
import { getPlan, hasFeature as planHasFeature, type FeatureKey } from "./plans";
import type { User } from "./users";

export async function requireSuperadmin(): Promise<{ user: User | null; response: NextResponse | null }> {
  const user = await getCurrentFullUser();
  if (!user || user.role !== "superadmin") {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, response: null };
}

export async function requireFeature(
  key: FeatureKey,
): Promise<{ user: User | null; response: NextResponse | null }> {
  const user = await getCurrentFullUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (user.role === "superadmin") {
    return { user, response: null };
  }
  const plan = getPlan(user.planId);
  if (!plan || !planHasFeature(plan, key)) {
    return {
      user,
      response: NextResponse.json(
        { error: "Paket Anda tidak termasuk fitur ini. Silakan upgrade paket." },
        { status: 403 },
      ),
    };
  }
  return { user, response: null };
}
