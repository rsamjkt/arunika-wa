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

type Store = Partial<Record<AIProvider, string>>;

function all(): Store {
  return readJson<Store>(FILE, {});
}

export function getProviderKey(provider: AIProvider): string {
  const stored = all()[provider];
  if (stored) return stored;
  return process.env[ENV_FALLBACK[provider]] ?? "";
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

export function setProviderKey(provider: AIProvider, key: string): void {
  const store = all();
  store[provider] = key;
  writeJson(FILE, store);
}

export function clearProviderKey(provider: AIProvider): void {
  const store = all();
  delete store[provider];
  writeJson(FILE, store);
}
