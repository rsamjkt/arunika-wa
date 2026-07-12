import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/authz";
import { listLeads } from "@/lib/leads";

export async function GET() {
  const { response } = await requireSuperadmin();
  if (response) return response;

  return NextResponse.json(listLeads());
}
