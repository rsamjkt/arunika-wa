import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/authz";
import { createLead, findLeadByPhone, type LeadCategory } from "@/lib/leads";

const CATEGORIES = new Set<LeadCategory>(["company", "school", "hospital"]);

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length >= 8 ? digits : null;
}

/** Expects columns: name,category,phone,email,address (category one of
 * company/school/hospital, phone/email optional but at least one of them
 * required). Header row auto-detected and skipped. Naive comma-split —
 * matches the same simplicity as the existing broadcast CSV import, no
 * quoted-field support. */
export async function POST(req: NextRequest) {
  const { response } = await requireSuperadmin();
  if (response) return response;

  const { csv } = await req.json();
  if (!csv || typeof csv !== "string") {
    return NextResponse.json({ error: "File CSV kosong" }, { status: 400 });
  }

  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l, i) => !(i === 0 && /^name,category,phone,email,address/i.test(l)));

  let added = 0;
  let skipped = 0;

  for (const line of lines) {
    const [rawName, rawCategory, rawPhone, rawEmail, rawAddress] = line.split(",").map((s) => s.trim());
    const name = rawName;
    if (!name) {
      skipped++;
      continue;
    }
    const category = CATEGORIES.has(rawCategory as LeadCategory) ? (rawCategory as LeadCategory) : "company";
    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    const email = rawEmail && rawEmail.includes("@") ? rawEmail.toLowerCase() : null;

    if (!phone && !email) {
      skipped++;
      continue;
    }
    if (phone && findLeadByPhone(phone)) {
      skipped++;
      continue;
    }

    createLead({
      name,
      category,
      area: "CSV Import",
      address: rawAddress || null,
      phone,
      email,
      website: null,
      source: "csv",
      placeId: null,
    });
    added++;
  }

  return NextResponse.json({ added, skipped });
}
