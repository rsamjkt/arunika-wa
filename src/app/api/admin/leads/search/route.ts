import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/authz";
import { isGooglePlacesConfigured } from "@/lib/googlePlaces";
import { searchAndSaveLeads } from "@/lib/leadOutreach";
import type { LeadCategory } from "@/lib/leads";

const CATEGORIES: LeadCategory[] = ["company", "school", "hospital"];

export async function POST(req: NextRequest) {
  const { response } = await requireSuperadmin();
  if (response) return response;

  if (!isGooglePlacesConfigured()) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY belum diatur di server. Tambahkan dulu sebelum mencari leads." },
      { status: 400 },
    );
  }

  const { category, area } = await req.json();
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Kategori tidak valid" }, { status: 400 });
  }
  if (!area || typeof area !== "string" || !area.trim()) {
    return NextResponse.json({ error: "Area wajib diisi" }, { status: 400 });
  }

  try {
    const result = await searchAndSaveLeads(category, area.trim());
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mencari leads" },
      { status: 500 },
    );
  }
}
