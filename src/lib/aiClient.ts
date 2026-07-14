import { providerForModel, type AIModel, type AIProvider } from "./aiAutoReply";
import { getProviderKey, isProviderConfigured } from "./aiProviderKeys";

const MAX_TOKENS = 400;

type ProviderConfig = {
  shape: "anthropic" | "openai-compatible";
  baseUrl: string; // unused for the anthropic shape, which hardcodes its own endpoint
  label: string;
};

// Deepseek, OpenAI, Gemini, Groq, Mistral, and Qwen all speak the same
// OpenAI-compatible chat/completions shape — only the base URL and key
// differ, so adding a new provider here is usually a one-line addition
// rather than a new call function.
const PROVIDERS: Record<AIProvider, ProviderConfig> = {
  anthropic: { shape: "anthropic", baseUrl: "", label: "Anthropic" },
  deepseek: { shape: "openai-compatible", baseUrl: "https://api.deepseek.com", label: "DeepSeek" },
  openai: { shape: "openai-compatible", baseUrl: "https://api.openai.com/v1", label: "OpenAI" },
  gemini: {
    shape: "openai-compatible",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    label: "Gemini",
  },
  groq: { shape: "openai-compatible", baseUrl: "https://api.groq.com/openai/v1", label: "Groq" },
  mistral: { shape: "openai-compatible", baseUrl: "https://api.mistral.ai/v1", label: "Mistral" },
  qwen: {
    shape: "openai-compatible",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    label: "Qwen",
  },
};

/** True if ANY provider has a key set — used to decide whether the AI
 * auto-reply feature exists at all on this platform. */
export function isAIConfigured(): boolean {
  return (Object.keys(PROVIDERS) as AIProvider[]).some((p) => isProviderConfigured(p));
}

/** True for the specific model a tenant has picked — a tenant could select
 * a model whose provider key isn't set, so this is checked separately from
 * the platform-wide isAIConfigured(). */
export function isModelConfigured(model: AIModel): boolean {
  return isProviderConfigured(providerForModel(model));
}

async function callAnthropic(systemPrompt: string, userContent: string, model: AIModel, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text || typeof text !== "string") throw new Error("Anthropic tidak mengembalikan balasan teks");
  return text.trim();
}

async function callOpenAICompatible(
  cfg: ProviderConfig,
  apiKey: string,
  systemPrompt: string,
  userContent: string,
  model: AIModel,
): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${cfg.label} API error: ${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") throw new Error(`${cfg.label} tidak mengembalikan balasan teks`);
  return text.trim();
}

/** One-shot completion, routed to whichever provider owns `model` — no SDKs,
 * matches this codebase's existing hand-rolled-fetch style (see waha.ts). */
export async function generateAIReply(systemPrompt: string, userContent: string, model: AIModel): Promise<string> {
  const provider = providerForModel(model);
  const cfg = PROVIDERS[provider];
  const apiKey = getProviderKey(provider);
  if (!apiKey) throw new Error(`API key untuk provider "${cfg.label}" belum diatur di server`);

  if (cfg.shape === "anthropic") return callAnthropic(systemPrompt, userContent, model, apiKey);
  return callOpenAICompatible(cfg, apiKey, systemPrompt, userContent, model);
}
