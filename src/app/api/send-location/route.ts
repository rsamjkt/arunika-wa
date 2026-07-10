import { NextRequest, NextResponse } from "next/server";
import { sendLocation, WahaError } from "@/lib/waha";

export async function POST(req: NextRequest) {
  try {
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
    const message = await sendLocation(session, chatId, latitude, longitude, title);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
