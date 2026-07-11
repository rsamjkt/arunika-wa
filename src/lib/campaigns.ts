import crypto from "node:crypto";
import { readJson, writeJson } from "./store";
import { sendText } from "./waha";
import { logEvent } from "./messageLog";
import { incrementUsage } from "./templates";

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
};

const FILE = "campaigns.json";
const MIN_DELAY_MS = 4000;
const MAX_DELAY_MS = 9000;

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
  };
  const campaigns = all();
  campaigns.push(campaign);
  save(campaigns);
  return campaign;
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

function substituteVariables(body: string, recipient: { chatId: string; name?: string }) {
  const digits = recipient.chatId.replace(/\D/g, "");
  return body.replace(/\{nama\}/g, recipient.name || "Pelanggan").replace(/\{nomor\}/g, digits);
}

export function cancelCampaign(ownerId: string, id: string) {
  const campaign = getCampaign(ownerId, id);
  if (!campaign) return;
  canceledCampaigns.add(id);
  if (campaign.status === "sending") {
    updateCampaign(id, { status: "canceled", completedAt: new Date().toISOString() });
  }
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
  for (const recipient of pending) {
    if (canceledCampaigns.has(id)) break;

    const text = substituteVariables(campaign.messageBody, recipient);
    try {
      await sendText(campaign.session, recipient.chatId, text);
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

    if (canceledCampaigns.has(id)) break;
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    await new Promise((r) => setTimeout(r, delay));
  }

  campaign = getCampaignUnscoped(id);
  if (campaign && campaign.status === "sending") {
    updateCampaign(id, { status: "completed", completedAt: new Date().toISOString() });
  }
  canceledCampaigns.delete(id);
}
