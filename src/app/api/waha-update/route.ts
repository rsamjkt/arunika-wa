import { NextResponse } from "next/server";
import { readJson } from "@/lib/store";

interface UpdateStatus {
  updateAvailable: boolean;
  localDigest: string;
  remoteDigest: string;
  remotePushedAt: string;
  checkedAt: string;
  checkOk: boolean;
}

export async function GET() {
  const status = readJson<UpdateStatus | null>("waha-update-status.json", null);
  return NextResponse.json(status);
}
