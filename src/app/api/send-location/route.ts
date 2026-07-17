import { NextRequest, NextResponse } from "next/server";
import { sendLocation, WahaError } from "@/lib/waha";
import { logEvent } from "@/lib/messageLog";
import { getCurrentApiKey } from "@/lib/currentUser";
import { getSessionOwner, requireSessionAccess } from "@/lib/tenancy";
import { reserveQuota, refundQuota, quotaExceededResponse } from "@/lib/authz";
import { parseJsonBody } from "@/lib/parseJsonBody";

export async function POST(req: NextRequest) {
  const { body, response: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;
  const { session, chatId, latitude, longitude, title } = body!;
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
  const { user, response } = await requireSessionAccess(session);
  if (response) return response;
  if (!reserveQuota(user!)) return quotaExceededResponse();
  const ownerId = getSessionOwner(session) ?? user!.id;
  const apiKey = await getCurrentApiKey();

  try {
    const message = await sendLocation(session, chatId, latitude, longitude, title);
    logEvent({ ownerId, actorId: user!.id, apiKeyId: apiKey?.id, direction: "out", session, chatId, kind: "location", status: "sent", source: "manual" });
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const status = err instanceof WahaError ? err.status : 500;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    refundQuota(user!);
    logEvent({ ownerId, actorId: user!.id, apiKeyId: apiKey?.id, direction: "out", session, chatId, kind: "location", status: "failed", source: "manual", error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
