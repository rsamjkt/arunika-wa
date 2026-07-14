import { readJson, writeJson } from "./store";

export type AIProvider = "anthropic" | "deepseek" | "openai";

export type AIModel =
  | "claude-haiku-4-5-20251001"
  | "claude-sonnet-5"
  | "claude-opus-4-8"
  | "deepseek-chat"
  | "deepseek-reasoner"
  | "gpt-4o-mini"
  | "gpt-4o";

export const AI_MODELS: { id: AIModel; provider: AIProvider; label: string; description: string }[] = [
  {
    id: "claude-haiku-4-5-20251001",
    provider: "anthropic",
    label: "Claude Haiku 4.5",
    description: "Cepat & paling hemat biaya — cocok untuk balasan singkat sehari-hari.",
  },
  {
    id: "claude-sonnet-5",
    provider: "anthropic",
    label: "Claude Sonnet 5",
    description: "Lebih pintar, biaya sedang — cocok kalau pertanyaan pelanggan sering rumit.",
  },
  {
    id: "claude-opus-4-8",
    provider: "anthropic",
    label: "Claude Opus 4.8",
    description: "Paling pintar, biaya paling tinggi — untuk kasus yang butuh pemahaman terbaik.",
  },
  {
    id: "deepseek-chat",
    provider: "deepseek",
    label: "DeepSeek Chat",
    description: "Model umum DeepSeek — sangat hemat biaya, kualitas bagus untuk percakapan sehari-hari.",
  },
  {
    id: "deepseek-reasoner",
    provider: "deepseek",
    label: "DeepSeek Reasoner (R1)",
    description: "Model reasoning DeepSeek — lebih pintar untuk pertanyaan yang butuh penalaran lebih dalam.",
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    label: "GPT-4o mini",
    description: "Model OpenAI yang ringan dan hemat biaya.",
  },
  {
    id: "gpt-4o",
    provider: "openai",
    label: "GPT-4o",
    description: "Model OpenAI yang lebih pintar, biaya lebih tinggi.",
  },
];

export function isValidAIModel(model: unknown): model is AIModel {
  return typeof model === "string" && AI_MODELS.some((m) => m.id === model);
}

export function providerForModel(model: AIModel): AIProvider {
  return AI_MODELS.find((m) => m.id === model)?.provider ?? "anthropic";
}

// A platform-wide env var can still set the default for new tenants, but
// each tenant's own saved choice always takes precedence once they pick one.
const DEFAULT_MODEL: AIModel = isValidAIModel(process.env.AI_AUTOREPLY_MODEL)
  ? process.env.AI_AUTOREPLY_MODEL
  : "claude-haiku-4-5-20251001";

export type AIAutoReplySettings = {
  enabled: boolean;
  businessName: string;
  knowledgeBase: string;
  tone: string;
  model: AIModel;
};

const FILE = "ai-autoreply.json";
const USAGE_FILE = "ai-autoreply-usage.json";
const DAILY_CAP = Number(process.env.AI_AUTOREPLY_DAILY_CAP ?? "200");

const DEFAULTS: AIAutoReplySettings = {
  enabled: false,
  businessName: "",
  knowledgeBase: "",
  tone: "ramah, singkat, dan profesional",
  model: DEFAULT_MODEL,
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
