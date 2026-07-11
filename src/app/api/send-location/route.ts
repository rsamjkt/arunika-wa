import { NextRequest, NextResponse } from "next/server";
import { sendLocation, WahaError } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";

export async function POST(req: NextRequest) {
  const { session, chatId, latitude, longitude, title } = await req.json();
  if (
    !session ||
    !chatId ||
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !title
  ) {
    return NextResponse.json(
      {
        error:
          "session, chatId, latitude (number), longitude (number), dan title wajib diisi",
      },
      { status: 400 },
    );
  }
  try {
    const message = await sendLocation(session, chatId, latitude, longitude, title);
    logEvent({ direction: "out", session, chatId, kind: "location", status: "sent", source: "manual" });
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logEvent({ direction: "out", session, chatId, kind: "location", status: "failed", source: "manual", error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
