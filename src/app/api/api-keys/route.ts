import { NextRequest, NextResponse } from "next/server";
import { createApiKey, listApiKeys } from "@/lib/apikeys";
import { getCurrentFullUser } from "@/lib/currentUser";

export async function GET() {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(listApiKeys(user.id));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentFullUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  const record = createApiKey(user.id, typeof name === "string" ? name : "");
  return NextResponse.json(record, { status: 201 });
}
