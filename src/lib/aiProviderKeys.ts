import { readJson, writeJson } from "./store";
import type { AIProvider } from "./aiAutoReply";

const FILE = "ai-provider-keys.json";

// Env vars still work as a fallback (e.g. set at deploy time) — a key saved
// through the admin UI takes precedence once one exists.
const ENV_FALLBACK: Record<AIProvider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  mistral: "MISTRAL_API_KEY",
  qwen: "QWEN_API_KEY",
};

// Sensible default endpoint per provider — shown as a pre-filled placeholder
// in the admin UI and used whenever the admin hasn't overridden it. Most
// tenants of this platform will never need to touch this; it exists mainly
// for regional variants (Qwen has separate international/China endpoints)
// or pointing at a compatible proxy/self-hosted server.
export const DEFAULT_BASE_URLS: Record<AIProvider, string> = {
  anthropic: "https://api.anthropic.com",
  deepseek: "https://api.deepseek.com",
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  groq: "https://api.groq.com/openai/v1",
  mistral: "https://api.mistral.ai/v1",
  qwen: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
};

type ProviderEntry = { apiKey: string; baseUrl?: string };
type Store = Partial<Record<AIProvider, ProviderEntry>>;

function all(): Store {
  return readJson<Store>(FILE, {});
}

export function getProviderKey(provider: AIProvider): string {
  const stored = all()[provider]?.apiKey;
  if (stored) return stored;
  return process.env[ENV_FALLBACK[provider]] ?? "";
}

export function getProviderBaseUrl(provider: AIProvider): string {
  return all()[provider]?.baseUrl || DEFAULT_BASE_URLS[provider];
}

export function isProviderConfigured(provider: AIProvider): boolean {
  return getProviderKey(provider).length > 0;
}

/** Never returns the actual key — only enough to render a masked
 * "sk-ant-...wxyz" hint so the admin can recognize which key is active
 * without it ever round-tripping back through the browser. */
export function maskedKeyHint(provider: AIProvider): string | null {
  const key = getProviderKey(provider);
  if (!key) return null;
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export function setProviderKey(provider: AIProvider, key: string, baseUrl?: string): void {
  const store = all();
  const existing = store[provider];
  store[provider] = {
    apiKey: key,
    baseUrl: baseUrl?.trim() || existing?.baseUrl,
  };
  writeJson(FILE, store);
}

/** Sets only the base URL, leaving whatever key (or env-var fallback) is
 * already in effect untouched — lets an admin fix just the region/endpoint
 * without having to re-paste the key. */
export function setProviderBaseUrl(provider: AIProvider, baseUrl: string): void {
  const store = all();
  const existing = store[provider] ?? { apiKey: "" };
  store[provider] = { ...existing, baseUrl: baseUrl.trim() || undefined };
  writeJson(FILE, store);
}

export function clearProviderKey(provider: AIProvider): void {
  const store = all();
  delete store[provider];
  writeJson(FILE, store);
}
