import { NextResponse } from "next/server";
import { getChatsOverview, WahaError } from "@/lib/waha";

type Params = { params: Promise<{ session: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { session } = await params;
  try {
    const chats = await getChatsOverview(session);
    return NextResponse.json(chats);
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
