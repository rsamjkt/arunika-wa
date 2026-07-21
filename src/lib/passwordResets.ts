import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

type ResetRecord = { token: string; userId: string; expiresAt: string; used: boolean };

const FILE = "password-resets.json";
const TTL_MS = 60 * 60 * 1000; // 1 hour

function all(): ResetRecord[] {
  return readJson<ResetRecord[]>(FILE, []);
}

export function createResetToken(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const list = all();
  list.push({ token, userId, expiresAt: new Date(Date.now() + TTL_MS).toISOString(), used: false });
  writeJson(FILE, list);
  return token;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Returns the userId if the token is valid and unused, consuming it in
 * the same call (single-use). Null if invalid/expired/already used. */
export function consumeResetToken(token: string): string | null {
  const list = all();
  const record = list.find((r) => timingSafeStringEqual(r.token, token));
  if (!record || record.used || new Date(record.expiresAt).getTime() < Date.now()) {
    return null;
  }
  writeJson(
    FILE,
    list.map((r) => (r.token === record.token ? { ...r, used: true } : r)),
  );
  return record.userId;
}
