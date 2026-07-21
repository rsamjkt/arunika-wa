import { NextResponse } from "next/server";
import { readJson } from "@/lib/store";
import { requireSuperadmin } from "@/lib/authz";

interface UpdateStatus {
  updateAvailable: boolean;
  localDigest: string;
  remoteDigest: string;
  remotePushedAt: string;
  checkedAt: string;
  checkOk: boolean;
}

export async function GET() {
  // Same reasoning as /api/server — this exposes internal engine-update
  // tracking data that must stay superadmin-only.
  const { response } = await requireSuperadmin();
  if (response) return response;

  const status = readJson<UpdateStatus | null>("waha-update-status.json", null);
  return NextResponse.json(status);
}
