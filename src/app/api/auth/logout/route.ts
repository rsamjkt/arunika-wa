import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("arunika_session")?.value;
  if (token) deleteSession(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("arunika_session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
