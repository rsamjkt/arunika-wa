import { NextRequest, NextResponse } from "next/server";

/** `req.json()` throws on a malformed/empty body — previously uncaught in
 * most routes, so a bad request fell through to a generic framework 500
 * instead of this app's usual `{ error: "..." }` JSON shape. Mirrors the
 * `{ user, response }` early-return pattern already used by
 * requireSessionAccess/requireFeature elsewhere in this codebase.
 *
 * `body` is typed `any` to match `req.json()`'s own return type exactly —
 * every call site already does its own runtime validation (typeof/truthy
 * checks) on the destructured fields, some of which are plain truthiness
 * checks that wouldn't narrow a stricter `unknown` type. Widening the
 * type here would ripple type friction across ~17 call sites for no
 * actual safety gain, since none of them skip validation today. */
// Route Handlers (unlike Server Actions' bodySizeLimit) impose no
// built-in cap on JSON body size — an unbounded payload (e.g. a campaign
// with an enormous `recipients` array) gets fully buffered into memory
// and then synchronously JSON.stringify'd + written to disk by
// store.ts, stalling the single Node.js event loop for every tenant at
// once. 5 MB comfortably covers any legitimate payload in this app
// (the largest is a broadcast recipient list) while bounding the worst case.
const MAX_BODY_BYTES = 5 * 1024 * 1024;

export async function parseJsonBody(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ body: any; response: NextResponse | null }> {
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return { body: null, response: NextResponse.json({ error: "Body permintaan terlalu besar" }, { status: 413 }) };
  }
  try {
    const body = await req.json();
    return { body, response: null };
  } catch {
    return { body: null, response: NextResponse.json({ error: "Body permintaan tidak valid" }, { status: 400 }) };
  }
}
