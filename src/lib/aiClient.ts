import { providerForModel, type AIModel, type AIProvider } from "./aiAutoReply";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

const MAX_TOKENS = 400;

function apiKeyFor(provider: AIProvider): string {
  if (provider === "anthropic") return ANTHROPIC_API_KEY;
  if (provider === "deepseek") return DEEPSEEK_API_KEY;
  return OPENAI_API_KEY;
}

/** True if ANY provider has a key set — used to decide whether the AI
 * auto-reply feature exists at all on this platform. */
export function isAIConfigured(): boolean {
  return Boolean(ANTHROPIC_API_KEY || DEEPSEEK_API_KEY || OPENAI_API_KEY);
}

/** True for the specific model a tenant has picked — a tenant could select
 * a model whose provider key isn't set, so this is checked separately from
 * the platform-wide isAIConfigured(). */
export function isModelConfigured(model: AIModel): boolean {
  return apiKeyFor(providerForModel(model)).length > 0;
}

async function callAnthropic(systemPrompt: string, userContent: string, model: AIModel): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
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

/** DeepSeek and OpenAI both speak the same OpenAI-compatible chat
 * completions shape — one function covers both, only the base URL/key
 * differ. */
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  systemPrompt: string,
  userContent: string,
  model: AIModel,
  providerLabel: string,
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
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
  if (!res.ok) throw new Error(`${providerLabel} API error: ${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") throw new Error(`${providerLabel} tidak mengembalikan balasan teks`);
  return text.trim();
}

/** One-shot completion, routed to whichever provider owns `model` — no SDKs,
 * matches this codebase's existing hand-rolled-fetch style (see waha.ts). */
export async function generateAIReply(systemPrompt: string, userContent: string, model: AIModel): Promise<string> {
  const provider = providerForModel(model);
  if (!isModelConfigured(model)) {
    throw new Error(`API key untuk provider "${provider}" belum diatur di server`);
  }

  if (provider === "anthropic") return callAnthropic(systemPrompt, userContent, model);
  if (provider === "deepseek") {
    return callOpenAICompatible("https://api.deepseek.com", DEEPSEEK_API_KEY, systemPrompt, userContent, model, "DeepSeek");
  }
  return callOpenAICompatible("https://api.openai.com/v1", OPENAI_API_KEY, systemPrompt, userContent, model, "OpenAI");
}
