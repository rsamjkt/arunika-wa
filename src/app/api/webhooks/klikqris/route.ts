import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isPaidStatus } from "@/lib/klikqris";
import { activateFromPaidTransaction, getTransaction, markTransactionExpired } from "@/lib/transactions";

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  // KlikQRIS docs require the server to always answer 200, even on
  // malformed payloads or signature mismatches — non-200 triggers retries.
  let body: { order_id?: string; status?: string; signature?: string; payment_date?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const { order_id, status, signature, payment_date } = body;
  if (!order_id || !status || !signature) {
    return NextResponse.json({ ok: true });
  }

  const tx = getTransaction(order_id);
  if (!tx || !safeEqual(tx.signature, signature)) {
    return NextResponse.json({ ok: true });
  }

  if (isPaidStatus(status)) {
    activateFromPaidTransaction(order_id, payment_date);
  } else if (status === "EXPIRED") {
    markTransactionExpired(order_id);
  }

  return NextResponse.json({ ok: true });
}
