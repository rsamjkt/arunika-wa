import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/autoreply";
import { requireFeature } from "@/lib/authz";
import { getEffectiveTenantId } from "@/lib/users";

export async function GET() {
  const { user, response } = await requireFeature("autoreply");
  if (response) return response;
  return NextResponse.json(getSettings(getEffectiveTenantId(user!)));
}

export async function PUT(req: NextRequest) {
  const { user, response } = await requireFeature("autoreply");
  if (response) return response;

  const body = await req.json();
  const {
    enabled,
    welcomeEnabled,
    welcomeMessage,
    businessHours,
    outsideHoursEnabled,
    outsideHoursMessage,
  } = body;
  const next = updateSettings(getEffectiveTenantId(user!), {
    enabled: typeof enabled === "boolean" ? enabled : undefined,
    welcomeEnabled: typeof welcomeEnabled === "boolean" ? welcomeEnabled : undefined,
    welcomeMessage: typeof welcomeMessage === "string" ? welcomeMessage : undefined,
    businessHours: businessHours && typeof businessHours === "object" ? businessHours : undefined,
    outsideHoursEnabled: typeof outsideHoursEnabled === "boolean" ? outsideHoursEnabled : undefined,
    outsideHoursMessage: typeof outsideHoursMessage === "string" ? outsideHoursMessage : undefined,
  });
  return NextResponse.json(next);
}
