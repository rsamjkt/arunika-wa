import { providerForModel, type AIModel, type AIProvider } from "./aiAutoReply";
import { getProviderBaseUrl, getProviderKey, isProviderConfigured } from "./aiProviderKeys";

const MAX_TOKENS = 400;

// Fallback OpenRouter: model gratis sering 429 (shared pool). Dengan `models[]`,
// OpenRouter otomatis coba model berikut bila yang di depan gagal/limit — maks 3
// item total (batas API). Model utama (pilihan tenant) tetap dicoba pertama.
const OPENROUTER_FALLBACKS = ["z-ai/glm-5.2:free", "google/gemma-4-31b-it:free"];

type ProviderShape = { shape: "anthropic" | "openai-compatible"; label: string };

// Deepseek, OpenAI, Gemini, Groq, Mistral, and Qwen all speak the same
// OpenAI-compatible chat/completions shape — only the base URL and key
// differ (both editable per-provider at /admin/ai-providers), so adding a
// new OpenAI-compatible provider is a one-line addition here plus an entry
// in aiProviderKeys.ts's DEFAULT_BASE_URLS, not a new call function.
const PROVIDERS: Record<AIProvider, ProviderShape> = {
  anthropic: { shape: "anthropic", label: "Anthropic" },
  deepseek: { shape: "openai-compatible", label: "DeepSeek" },
  openai: { shape: "openai-compatible", label: "OpenAI" },
  gemini: { shape: "openai-compatible", label: "Gemini" },
  groq: { shape: "openai-compatible", label: "Groq" },
  mistral: { shape: "openai-compatible", label: "Mistral" },
  qwen: { shape: "openai-compatible", label: "Qwen" },
  openrouter: { shape: "openai-compatible", label: "OpenRouter" },
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

async function callAnthropic(
  baseUrl: string,
  apiKey: string,
  systemPrompt: string,
  userContent: string,
  model: AIModel,
): Promise<string> {
  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      // Prompt caching: blok system (boilerplate + knowledge base tenant) stabil
      // antar-pesan, jadi ditandai cache_control agar panggilan berikutnya dalam
      // window cache menagih ~10% untuk bagian ini alih-alih harga penuh. Untuk
      // CS auto-reply yang system-prompt-nya besar & dikirim tiap pesan, ini
      // pemangkas biaya terbesar. (Provider OpenAI-compatible meng-cache prefix
      // panjang otomatis, jadi tak perlu perubahan setara di sana.)
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
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
  baseUrl: string,
  apiKey: string,
  systemPrompt: string,
  userContent: string,
  model: AIModel,
  label: string,
  fallbackModels?: string[],
): Promise<string> {
  // Bila ada fallback (OpenRouter), pakai `models[]` (utama + cadangan, maks 3)
  // agar provider merutekan otomatis saat model utama limit/gagal. Provider lain
  // tetap pakai `model` tunggal seperti biasa.
  const modelField =
    fallbackModels && fallbackModels.length
      ? { models: [model, ...fallbackModels].slice(0, 3) }
      : { model };
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...modelField,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${label} API error: ${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") throw new Error(`${label} tidak mengembalikan balasan teks`);
  return text.trim();
}

/** One-shot completion, routed to whichever provider owns `model` — no SDKs,
 * matches this codebase's existing hand-rolled-fetch style (see waha.ts). */
export async function generateAIReply(systemPrompt: string, userContent: string, model: AIModel): Promise<string> {
  const provider = providerForModel(model);
  const cfg = PROVIDERS[provider];
  const apiKey = getProviderKey(provider);
  if (!apiKey) throw new Error(`API key untuk provider "${cfg.label}" belum diatur di server`);
  const baseUrl = getProviderBaseUrl(provider).replace(/\/$/, "");

  if (cfg.shape === "anthropic") return callAnthropic(baseUrl, apiKey, systemPrompt, userContent, model);
  const fallbacks = provider === "openrouter" ? OPENROUTER_FALLBACKS : undefined;
  return callOpenAICompatible(baseUrl, apiKey, systemPrompt, userContent, model, cfg.label, fallbacks);
}
