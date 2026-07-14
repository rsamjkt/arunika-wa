import type { AIModel } from "./aiAutoReply";

const API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

export function isAIConfigured(): boolean {
  return API_KEY.length > 0;
}

/** One-shot completion against Anthropic's Messages API — no SDK, matches
 * this codebase's existing hand-rolled-fetch style (see waha.ts). */
export async function generateAIReply(systemPrompt: string, userContent: string, model: AIModel): Promise<string> {
  if (!API_KEY) throw new Error("ANTHROPIC_API_KEY belum diatur di server");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI API error: ${res.status} ${body}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text || typeof text !== "string") throw new Error("AI tidak mengembalikan balasan teks");
  return text.trim();
}
