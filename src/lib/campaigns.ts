import crypto from "node:crypto";
import { readJson, writeJson } from "./store";
import { sendText } from "./waha";
import { getSessionSentToday, logEvent } from "./messageLog";
import { incrementUsage } from "./templates";
import { getFullUser } from "./users";
import { reserveQuota, refundQuota } from "./authz";
import { substituteVariables } from "./textVars";
import { createNotification } from "./notifications";
import { humanDelayMs, shouldAbortForFailures, PACING } from "./sendPacing";
import { applySpintax } from "./spintax";
import { warmupCapForSession } from "./numberHealth";

export type CampaignRecipient = {
  chatId: string;
  name?: string;
  status: "pending" | "sent" | "failed";
  error?: string;
  sentAt?: string;
};

export type Campaign = {
  id: string;
  ownerId: string;
  name: string;
  session: string;
  messageBody: string;
  templateId?: string;
  recipients: CampaignRecipient[];
  status: "draft" | "sending" | "completed" | "canceled";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  /** Set when the campaign should auto-start at a future time instead of
   * immediately — stays "draft" until run-scheduled-campaigns fires it. */
  scheduledAt?: string | null;
  /** Diisi saat proteksi anti-ban menghentikan campaign otomatis (gagal kirim
   * beruntun = sinyal nomor diblokir). Status dikembalikan ke "draft" agar bisa
   * dilanjutkan setelah nomor sehat kembali (sisa penerima tetap "pending"). */
  autoPausedReason?: string;
  autoPausedAt?: string;
};

const FILE = "campaigns.json";

// In-memory only — reset on restart, which is fine: startCampaign() is safe
// to call again and will pick up any still-pending recipients.
const activeCampaigns = new Set<string>();
const canceledCampaigns = new Set<string>();

function all(): Campaign[] {
  return readJson<Campaign[]>(FILE, []);
}

function save(campaigns: Campaign[]) {
  writeJson(FILE, campaigns);
}

export function listCampaigns(ownerId: string): Campaign[] {
  return all()
    .filter((c) => c.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Internal lookup (no ownership filter) — used by the background runner,
 * which already only ever operates on campaign IDs it started itself. */
function getCampaignUnscoped(id: string): Campaign | null {
  return all().find((c) => c.id === id) ?? null;
}

export function getCampaign(ownerId: string, id: string): Campaign | null {
  const campaign = getCampaignUnscoped(id);
  return campaign && campaign.ownerId === ownerId ? campaign : null;
}

export function isCampaignActive(id: string): boolean {
  return activeCampaigns.has(id);
}

export function createCampaign(
  ownerId: string,
  name: string,
  session: string,
  messageBody: string,
  recipients: { chatId: string; name?: string }[],
  templateId?: string,
  scheduledAt?: string | null,
): Campaign {
  const campaign: Campaign = {
    id: crypto.randomUUID(),
    ownerId,
    name,
    session,
    messageBody,
    templateId,
    recipients: recipients.map((r) => ({ ...r, status: "pending" as const })),
    status: "draft",
    createdAt: new Date().toISOString(),
    scheduledAt: scheduledAt ?? null,
  };
  const campaigns = all();
  campaigns.push(campaign);
  save(campaigns);
  return campaign;
}

/** Draft campaigns whose scheduled time has arrived — picked up by the
 * run-scheduled-campaigns cron endpoint. */
export function listDueCampaigns(): Campaign[] {
  const now = Date.now();
  return all().filter(
    (c) => c.status === "draft" && c.scheduledAt && new Date(c.scheduledAt).getTime() <= now,
  );
}

function updateCampaign(id: string, patch: Partial<Campaign>) {
  const campaigns = all();
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  save(campaigns.map((c) => (c.id === id ? { ...c, ...defined } : c)));
}

function updateRecipient(id: string, chatId: string, patch: Partial<CampaignRecipient>) {
  const campaigns = all();
  save(
    campaigns.map((c) =>
      c.id === id
        ? { ...c, recipients: c.recipients.map((r) => (r.chatId === chatId ? { ...r, ...patch } : r)) }
        : c,
    ),
  );
}

export function cancelCampaign(ownerId: string, id: string) {
  const campaign = getCampaign(ownerId, id);
  if (!campaign) return;
  canceledCampaigns.add(id);
  if (campaign.status === "sending") {
    updateCampaign(id, { status: "canceled", completedAt: new Date().toISOString() });
  }
}

/** Cascade delete — used when a tenant account is removed entirely.
 * Cancels any still-sending campaign first so the background runner sees
 * the cancellation flag before its data disappears out from under it. */
export function deleteAllForOwner(ownerId: string): void {
  for (const c of listCampaigns(ownerId)) {
    if (c.status === "sending") cancelCampaign(ownerId, c.id);
  }
  save(all().filter((c) => c.ownerId !== ownerId));
}

/** Fire-and-forget: begins (or resumes) sending. Safe to call multiple times. */
export function startCampaign(ownerId: string, id: string) {
  if (activeCampaigns.has(id)) return;
  const campaign = getCampaign(ownerId, id);
  if (!campaign) return;
  if (campaign.status === "completed" || campaign.status === "canceled") return;

  activeCampaigns.add(id);
  canceledCampaigns.delete(id);
  updateCampaign(id, { status: "sending", startedAt: campaign.startedAt ?? new Date().toISOString() });

  runCampaign(id).finally(() => {
    activeCampaigns.delete(id);
  });
}

async function runCampaign(id: string) {
  let campaign = getCampaignUnscoped(id);
  if (!campaign) return;

  const pending = campaign.recipients.filter((r) => r.status === "pending");
  let sent = 0;
  let consecutiveFailures = 0;
  let pauseReason: string | null = null;

  // Warmup anti-ban: batasi total kirim harian nomor sesuai umurnya (nomor baru
  // mengirim sedikit dulu, naik bertahap). Baseline = yang SUDAH terkirim hari
  // ini dari semua sumber, ditambah `sent` selama run ini.
  const warmupCap = warmupCapForSession(campaign.session);
  const sentTodayBaseline = getSessionSentToday(campaign.session);

  for (const recipient of pending) {
    if (canceledCampaigns.has(id)) break;

    // Batas warmup harian tercapai → jeda; sisa penerima tetap "pending".
    if (sentTodayBaseline + sent >= warmupCap) {
      pauseReason =
        `Dijeda otomatis: batas aman harian nomor tercapai (${warmupCap} pesan/hari untuk umur nomor saat ini). ` +
        `Ini melindungi nomor dari risiko blokir — lanjutkan besok. Makin lama nomor dipakai, batasnya makin besar.`;
      break;
    }

    const owner = getFullUser(campaign.ownerId);
    if (!owner || !reserveQuota(owner)) {
      updateRecipient(id, recipient.chatId, { status: "failed", error: "Kuota pesan bulanan habis" });
      continue;
    }

    // Variasi spintax {a|b|c} diacak per-penerima (anti-ban: hindari pesan
    // identik massal) — dijalankan SETELAH substitusi variabel {nama} dll.
    const text = applySpintax(substituteVariables(campaign.messageBody, recipient));
    try {
      await sendText(campaign.session, recipient.chatId, text);
      sent++;
      consecutiveFailures = 0;
      updateRecipient(id, recipient.chatId, { status: "sent", sentAt: new Date().toISOString() });
      logEvent({
        ownerId: campaign.ownerId,
        direction: "out",
        session: campaign.session,
        chatId: recipient.chatId,
        kind: "text",
        status: "sent",
        source: "broadcast",
        campaignId: id,
        templateId: campaign.templateId,
      });
      if (campaign.templateId) incrementUsage(campaign.templateId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      consecutiveFailures++;
      refundQuota(owner);
      updateRecipient(id, recipient.chatId, { status: "failed", error: message });
      logEvent({
        ownerId: campaign.ownerId,
        direction: "out",
        session: campaign.session,
        chatId: recipient.chatId,
        kind: "text",
        status: "failed",
        source: "broadcast",
        campaignId: id,
        templateId: campaign.templateId,
        error: message,
      });
    }

    // Proteksi anti-ban: gagal kirim beruntun = kemungkinan nomor diblokir/
    // terputus. Hentikan campaign agar tak mempercepat ban; sisa penerima tetap
    // "pending" sehingga bisa dilanjutkan setelah nomor sehat kembali.
    if (shouldAbortForFailures(consecutiveFailures)) {
      pauseReason =
        `Dihentikan otomatis: ${PACING.MAX_CONSECUTIVE_FAILURES} pengiriman gagal berturut-turut — ` +
        `kemungkinan nomor WhatsApp diblokir atau terputus. Periksa koneksi/kesehatan nomor, ` +
        `lalu lanjutkan campaign (sisa penerima masih tersimpan).`;
      break;
    }

    if (canceledCampaigns.has(id)) break;
    // Jeda manusiawi (jitter + micro-break berkala) supaya pola kirim tak
    // seragam seperti mesin — lihat sendPacing.ts.
    await new Promise((r) => setTimeout(r, humanDelayMs(sent)));
  }

  if (pauseReason) {
    updateCampaign(id, { status: "draft", autoPausedReason: pauseReason, autoPausedAt: new Date().toISOString() });
    createNotification(
      campaign.ownerId,
      "campaign_paused",
      `Campaign "${campaign.name}" dijeda otomatis`,
      pauseReason,
      "/broadcast",
    );
    return;
  }

  campaign = getCampaignUnscoped(id);
  if (campaign && campaign.status === "sending") {
    updateCampaign(id, { status: "completed", completedAt: new Date().toISOString() });
    const sent = campaign.recipients.filter((r) => r.status === "sent").length;
    const failed = campaign.recipients.filter((r) => r.status === "failed").length;
    createNotification(
      campaign.ownerId,
      "campaign_completed",
      `Campaign "${campaign.name}" selesai`,
      `Terkirim ke ${sent} penerima${failed > 0 ? `, ${failed} gagal` : ""}.`,
      "/broadcast",
    );
  }
  canceledCampaigns.delete(id);
}
