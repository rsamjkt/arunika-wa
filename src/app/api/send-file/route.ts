import { NextRequest, NextResponse } from "next/server";
import { sendFile, WahaError, type FileInput } from "@/lib/waha";

export async function POST(req: NextRequest) {
  try {
    const { session, chatId, file, caption } = await req.json();
    if (!session || !chatId || !file?.mimetype || !(file.url || file.data)) {
      return NextResponse.json(
        {
          error:
            "session, chatId, dan file (mimetype + url atau data base64) wajib diisi",
        },
        { status: 400 },
      );
    }
    const message = await sendFile(session, chatId, file as FileInput, caption);
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status },
    );
  }
}
