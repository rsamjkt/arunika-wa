import { NextRequest } from "next/server";
import { getCurrentFullUser } from "@/lib/currentUser";
import { getEffectiveTenantId } from "@/lib/users";
import { subscribe } from "@/lib/eventBus";

// Stream SSE: server men-push event (mis. pesan masuk) ke browser inbox secara
// INSTAN. Autentikasi via cookie sesi. Heartbeat menjaga koneksi tetap hidup
// menembus proxy/Cloudflare; X-Accel-Buffering:no mematikan buffering proxy.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentFullUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const ownerId = getEffectiveTenantId(user);

  const encoder = new TextEncoder();
  let unsub: () => void = () => {};
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* stream ditutup */
        }
      };
      enqueue(": connected\n\n");
      unsub = subscribe(ownerId, (data) => enqueue(`data: ${data}\n\n`));
      heartbeat = setInterval(() => enqueue(": ping\n\n"), 25_000);
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsub();
        try {
          controller.close();
        } catch {
          /* sudah tertutup */
        }
      });
    },
    cancel() {
      clearInterval(heartbeat);
      unsub();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
