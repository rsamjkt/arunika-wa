import { readJson, writeJson } from "./store";

export type AIAutoReplySettings = {
  enabled: boolean;
  businessName: string;
  knowledgeBase: string;
  tone: string;
};

const FILE = "ai-autoreply.json";
const USAGE_FILE = "ai-autoreply-usage.json";
const DAILY_CAP = Number(process.env.AI_AUTOREPLY_DAILY_CAP ?? "200");

const DEFAULTS: AIAutoReplySettings = {
  enabled: false,
  businessName: "",
  knowledgeBase: "",
  tone: "ramah, singkat, dan profesional",
};

type Store = Record<string, AIAutoReplySettings>;

function all(): Store {
  return readJson<Store>(FILE, {});
}

export function getAISettings(ownerId: string): AIAutoReplySettings {
  return { ...DEFAULTS, ...(all()[ownerId] ?? {}) };
}

export function updateAISettings(ownerId: string, patch: Partial<AIAutoReplySettings>): AIAutoReplySettings {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  const next = { ...getAISettings(ownerId), ...defined };
  const store = all();
  store[ownerId] = next;
  writeJson(FILE, store);
  return next;
}

/** Cascade delete — used when a tenant account is removed entirely. */
export function deleteAISettingsForOwner(ownerId: string): void {
  const store = all();
  delete store[ownerId];
  writeJson(FILE, store);
}

type UsageStore = Record<string, number>;

/** WIB (UTC+7) calendar date — daily cap resets at local midnight, not UTC. */
function wibDateKey(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Per-tenant, per-day cap on AI calls — each call costs real money on the
 * platform's own API key, so one tenant's spam/traffic spike can't run up
 * an unbounded bill. Independent of message quota, which governs WA sends. */
export function canUseAIToday(ownerId: string): boolean {
  const usage = readJson<UsageStore>(USAGE_FILE, {});
  return (usage[`${ownerId}:${wibDateKey()}`] ?? 0) < DAILY_CAP;
}

export function recordAIUsage(ownerId: string): void {
  const usage = readJson<UsageStore>(USAGE_FILE, {});
  const key = `${ownerId}:${wibDateKey()}`;
  usage[key] = (usage[key] ?? 0) + 1;
  writeJson(USAGE_FILE, usage);
}
