import { NextRequest, NextResponse } from "next/server";
import { createApiKey, listApiKeys } from "@/lib/apikeys";

export async function GET() {
  return NextResponse.json(listApiKeys());
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const record = createApiKey(typeof name === "string" ? name : "");
  return NextResponse.json(record, { status: 201 });
}
