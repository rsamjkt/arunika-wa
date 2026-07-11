import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/autoreply";

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const {
    enabled,
    welcomeEnabled,
    welcomeMessage,
    businessHours,
    outsideHoursEnabled,
    outsideHoursMessage,
  } = body;
  const next = updateSettings({
    enabled: typeof enabled === "boolean" ? enabled : undefined,
    welcomeEnabled: typeof welcomeEnabled === "boolean" ? welcomeEnabled : undefined,
    welcomeMessage: typeof welcomeMessage === "string" ? welcomeMessage : undefined,
    businessHours: businessHours && typeof businessHours === "object" ? businessHours : undefined,
    outsideHoursEnabled: typeof outsideHoursEnabled === "boolean" ? outsideHoursEnabled : undefined,
    outsideHoursMessage: typeof outsideHoursMessage === "string" ? outsideHoursMessage : undefined,
  });
  return NextResponse.json(next);
}
