// Loop AGENT untuk Arunika: model boleh memanggil TOOLS beberapa langkah lalu
// memberi balasan final. Protokol JSON-action (model-agnostik) → jalan di semua
// provider OpenAI-compatible tanpa butuh native function-calling. Fallback aman:
// output yang bukan aksi valid dipakai apa adanya sebagai balasan.
import type { AIModel } from "./aiAutoReply";
import { generateAIReply } from "./aiClient";
import { toolByName, toolsPromptSpec, type ToolContext } from "./aiTools";

export type AgentAction =
  | { type: "tool"; name: string; args: Record<string, unknown> }
  | { type: "reply"; reply: string }
  | { type: "none" };

/** Ekstrak aksi JSON dari output model (toleran terhadap ```json / teks pembungkus). */
export function parseAction(raw: string): AgentAction {
  if (!raw) return { type: "none" };
  const candidates: string[] = [];
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1]);
  const brace = raw.match(/\{[\s\S]*\}/);
  if (brace) candidates.push(brace[0]);
  candidates.push(raw);
  for (const c of candidates) {
    try {
      const obj = JSON.parse(c.trim()) as Record<string, unknown>;
      if (obj && typeof obj === "object") {
        if (typeof obj.reply === "string") return { type: "reply", reply: obj.reply };
        if (typeof obj.tool === "string") {
          const args = obj.args && typeof obj.args === "object" ? (obj.args as Record<string, unknown>) : {};
          return { type: "tool", name: obj.tool, args };
        }
      }
    } catch {
      /* coba kandidat berikutnya */
    }
  }
  return { type: "none" };
}

export type AgentResult = { reply: string; toolsUsed: string[] };

export async function runAgent(
  persona: string,
  transcript: string,
  model: AIModel,
  ctx: ToolContext,
  maxSteps = 3,
): Promise<AgentResult> {
  const sys = [
    persona,
    "",
    "Kamu punya TOOLS berikut (opsional — pakai HANYA bila membantu menjawab lebih akurat):",
    toolsPromptSpec(),
    "",
    "PROTOKOL: Balas SELALU dengan SATU objek JSON saja, tanpa teks lain.",
    '- Memakai tool: {"tool":"nama_tool","args":{...}}',
    '- Balasan final ke pelanggan: {"reply":"teks balasan"}',
    "Setelah tiap tool kamu diberi hasilnya. Jangan mengarang hasil tool.",
  ].join("\n");

  let convo = `${transcript}\n\nTentukan aksi berikutnya (JSON).`;
  const toolsUsed: string[] = [];

  for (let step = 0; step < maxSteps; step++) {
    const raw = await generateAIReply(sys, convo, model);
    const action = parseAction(raw);
    if (action.type === "reply") return { reply: action.reply, toolsUsed };
    if (action.type === "tool") {
      const tool = toolByName(action.name);
      let obs: string;
      if (!tool) obs = `Tool "${action.name}" tidak tersedia.`;
      else {
        toolsUsed.push(action.name);
        try {
          obs = String(await tool.run(action.args, ctx));
        } catch {
          obs = "Tool gagal dijalankan.";
        }
      }
      convo += `\n\n[Aksi: tool ${action.name}]\nHasil: ${obs}\n\nTentukan aksi berikutnya (JSON) — pakai tool lain atau balas final {"reply":...}.`;
      continue;
    }
    return { reply: raw, toolsUsed }; // fallback aman
  }
  const finalReply = await generateAIReply(
    `${persona}\nBalas pelanggan sekarang secara final & singkat.`,
    transcript,
    model,
  );
  return { reply: finalReply, toolsUsed };
}
