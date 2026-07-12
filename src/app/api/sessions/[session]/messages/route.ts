import { NextRequest, NextResponse } from "next/server";
import { getMessages, WahaError } from "@/lib/waha";
import { requireSessionAccess } from "@/lib/tenancy";

type Params = { params: Promise<{ session: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { session } = await params;
  const { response } = await requireSessionAccess(session);
  if (response) return response;

  const chatId = req.nextUrl.searchParams.get("chatId");
  if (!chatId) {
    return NextResponse.json({ error: "chatId wajib diisi" }, { status: 400 });
  }
  try {
    const messages = await getMessages(session, chatId);
    const proxied = messages.map((m) => {
      if (!m.media?.url) return m;
      try {
        const path = new URL(m.media.url).pathname;
        return {
          ...m,
          media: { ...m.media, url: `/api/sessions/${encodeURIComponent(session)}/media?path=${encodeURIComponent(path)}` },
        };
      } catch {
        return m;
      }
    });
    return NextResponse.json(proxied);
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
