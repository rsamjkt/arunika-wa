const BASE_URL = process.env.KLIKQRIS_BASE_URL ?? "https://klikqris.com/api";
const API_KEY = process.env.KLIKQRIS_API_KEY ?? "";
const MERCHANT_ID = process.env.KLIKQRIS_MERCHANT_ID ?? "";

export class KlikQrisError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface QrisTransaction {
  order_id: string;
  nama_toko?: string;
  amount: string;
  total_amount: string;
  status: "PENDING" | "SUCCESS" | "PAID" | "EXPIRED";
  qris_url?: string;
  qris_image?: string;
  expired_at: string;
  paid_at: string | null;
  signature: string;
  keterangan?: string;
  created_at: string;
}

async function klikqrisJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      id_merchant: MERCHANT_ID,
      ...init.headers,
    },
  });
  const text = await res.text();
  let data: { status?: boolean; message?: string } & Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!res.ok || data.status === false) {
    throw new KlikQrisError(res.status, data.message || res.statusText || "KlikQRIS request failed");
  }
  return data as T;
}

/** Treats both documented "success" values as paid — the KlikQRIS docs use
 * PAID in the webhook payload but SUCCESS in the status-check response. */
export function isPaidStatus(status: string): boolean {
  return status === "PAID" || status === "SUCCESS";
}

export async function createTransaction(
  orderId: string,
  amount: number,
  keterangan: string,
  callbackUrl?: string,
): Promise<QrisTransaction> {
  const res = await klikqrisJson<{ data: QrisTransaction }>("/qris/create", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      id_merchant: MERCHANT_ID,
      amount,
      keterangan,
      ...(callbackUrl ? { callback_url: callbackUrl } : {}),
    }),
  });
  return res.data;
}

export async function checkStatus(orderId: string): Promise<QrisTransaction> {
  const res = await klikqrisJson<{ data: QrisTransaction }>(
    `/qris/status/${encodeURIComponent(orderId)}`,
  );
  return res.data;
}
