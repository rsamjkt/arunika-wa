import { NextRequest, NextResponse } from "next/server";
import { requireSessionAccess } from "@/lib/tenancy";

const WAHA_BASE_URL = process.env.WAHA_BASE_URL ?? "http://localhost:3000";
const API_KEY = process.env.WAHA_API_KEY ?? "";

type Params = { params: Promise<{ session: string }> };

/** Streams a media file from the WA engine's internal file server through
 * this app, since that server isn't reachable from the browser and its
 * files require an API key we never expose client-side. `path` is
 * restricted to the engine's own /api/files/ prefix to prevent this from
 * becoming an open proxy to arbitrary internal URLs. */
export async function GET(req: NextRequest, { params }: Params) {
  const { session } = await params;
  const { response } = await requireSessionAccess(session);
  if (response) return response;

  const path = req.nextUrl.searchParams.get("path");
  if (!path || !path.startsWith("/api/files/")) {
    return NextResponse.json({ error: "Path media tidak valid" }, { status: 400 });
  }

  const upstream = await fetch(`${WAHA_BASE_URL}${path}`, {
    headers: { "X-Api-Key": API_KEY },
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Media tidak ditemukan" }, { status: upstream.status || 404 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
