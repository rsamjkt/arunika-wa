import { sendText } from "./waha";
import { leadOfferEmail, sendEmail } from "./email";
import { getAppUrl } from "./appUrl";
import {
  createLead,
  findLeadByPlaceId,
  listNewLeads,
  optOutByPhone,
  updateLead,
  type Lead,
  type LeadCategory,
} from "./leads";
import { getPlaceDetails, searchPlaces } from "./googlePlaces";

const SESSION = process.env.ADMIN_NOTIFY_SESSION ?? "";
const MIN_DELAY_MS = 5000;
const MAX_DELAY_MS = 12000;
const STOP_KEYWORDS = ["stop", "berhenti", "unsubscribe", "unsub"];

const CATEGORY_QUERY: Record<LeadCategory, string> = {
  company: "perusahaan",
  school: "sekolah",
  hospital: "rumah sakit",
};

/** Searches Google Places for the given category/area, dedupes against
 * leads we already have (by placeId), and saves any new ones with
 * status "new" — sending itself happens later via sendOfferBatch (picked
 * up by the lead-outreach cron), never inline with the search request. */
export async function searchAndSaveLeads(
  category: LeadCategory,
  area: string,
): Promise<{ found: number; added: number }> {
  const query = `${CATEGORY_QUERY[category]} di ${area}`;
  const results = await searchPlaces(query);

  let added = 0;
  for (const r of results) {
    if (findLeadByPlaceId(r.placeId)) continue;

    let phone: string | null = null;
    let website: string | null = null;
    try {
      const details = await getPlaceDetails(r.placeId);
      phone = details.phone;
      website = details.website;
    } catch {
      // Details lookup failed for this one place — still save the lead
      // with just name/address so it isn't silently dropped.
    }

    const email = website ? await bestEffortEmailFromWebsite(website) : null;

    createLead({
      name: r.name,
      category,
      area,
      address: r.address,
      phone,
      email,
      website,
      source: "google_places",
      placeId: r.placeId,
    });
    added++;
  }

  return { found: results.length, added };
}

// "website" comes from Google Places' own data, not a random end user, but
// it's still a third-party-supplied URL we fetch server-side — reject
// anything pointing at loopback/private/link-local addresses so a crafted
// listing can't turn this into an internal-network probe (this same
// server also runs the WA engine on localhost:3000).
const PRIVATE_HOST_RE = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0$|\[?::1\]?$)/i;
const MAX_FETCH_BYTES = 512 * 1024;

function isSafeExternalUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (url.protocol === "http:" || url.protocol === "https:") && !PRIVATE_HOST_RE.test(url.hostname);
  } catch {
    return false;
  }
}

async function readCapped(body: ReadableStream<Uint8Array>, maxBytes: number): Promise<string> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    chunks.push(value);
    if (total >= maxBytes) {
      reader.cancel().catch(() => {});
      break;
    }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
}

/** Fetches a business's homepage and regex-scans for a contact email.
 * Best-effort only — Google Places has no email field, most sites won't
 * yield a match, and that's fine: the WA offer still goes out regardless. */
async function bestEffortEmailFromWebsite(website: string): Promise<string | null> {
  if (!isSafeExternalUrl(website)) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(website, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok || !res.body) return null;
    const html = await readCapped(res.body, MAX_FETCH_BYTES);
    const matches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
    const blocked = /\.(png|jpg|jpeg|gif|svg|webp)$|sentry|wixpress|schema\.org|example\.com/i;
    const found = matches.find((m) => !blocked.test(m));
    return found?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

/** Sends the offer (WA if phone present, email if email present) to up to
 * `limit` leads still in "new" status, with a randomized delay between
 * each send — called in small batches by the lead-outreach cron so real
 * daily volume stays low instead of blasting everything at once. */
export async function sendOfferBatch(limit: number): Promise<{ sent: number; failed: number }> {
  const leads = listNewLeads(limit);
  let sent = 0;
  let failed = 0;

  for (const lead of leads) {
    const ok = await sendOfferToLead(lead);
    if (ok) sent++;
    else failed++;

    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    await new Promise((r) => setTimeout(r, delay));
  }

  return { sent, failed };
}

async function sendOfferToLead(lead: Lead): Promise<boolean> {
  const helpUrl = `${getAppUrl()}/help`;
  let anySuccess = false;
  let lastError: string | null = null;

  if (lead.phone && SESSION) {
    try {
      const text =
        `Halo dari Arunika · WA.\n\n` +
        `Kami menyediakan platform WhatsApp Gateway untuk bisnis — kirim pesan, broadcast, ` +
        `auto-reply, dan integrasi API, mulai dari Rp0/bulan (paket gratis tersedia, paket ` +
        `berbayar via QRIS).\n\n` +
        `Info lengkap: ${helpUrl}\n\n` +
        `Balas STOP jika tidak ingin menerima info dari kami lagi.`;
      await sendText(SESSION, `${lead.phone}@c.us`, text);
      anySuccess = true;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  if (lead.email) {
    try {
      const { subject, html } = leadOfferEmail(lead.name, helpUrl);
      await sendEmail(lead.email, subject, html);
      anySuccess = true;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  if (!lead.phone && !lead.email) {
    updateLead(lead.id, { status: "failed", lastError: "Tidak ada nomor WA atau email" });
    return false;
  }

  updateLead(lead.id, {
    status: anySuccess ? "contacted" : "failed",
    contactedAt: anySuccess ? new Date().toISOString() : null,
    lastError: anySuccess ? null : lastError,
  });
  return anySuccess;
}

/** Called from the inbound WA webhook for every message sent to the
 * outreach session — opts a lead out permanently on a stop keyword. Runs
 * regardless of any tenant's autoreply settings, since honoring opt-out
 * isn't optional. */
export function checkLeadOptOut(session: string, chatId: string, text: string): void {
  if (session !== SESSION) return;
  const lower = text.trim().toLowerCase();
  if (!STOP_KEYWORDS.some((kw) => lower === kw || lower.includes(kw))) return;
  const phone = chatId.replace(/@.*/, "");
  optOutByPhone(phone);
}
