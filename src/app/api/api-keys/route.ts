import { NextRequest, NextResponse } from "next/server";
import { createApiKey, listApiKeys } from "@/lib/apikeys";
import { requireFeature } from "@/lib/authz";

export async function GET() {
  const { user, response } = await requireFeature("apikeys");
  if (response) return response;
  return NextResponse.json(listApiKeys(user!.id));
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireFeature("apikeys");
  if (response) return response;

  const { name } = await req.json();
  const record = createApiKey(user!.id, typeof name === "string" ? name : "");
  return NextResponse.json(record, { status: 201 });
}
