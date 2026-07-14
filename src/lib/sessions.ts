import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

export type AuthSession = {
  token: string;
  userId: string;
  username: string;
  createdAt: string;
};

const FILE = "web-sessions.json";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Unlike message-log.ts/webhookLog.ts (capped by entry count), sessions
 * previously had no cap or expiry at all — a user who closes the tab
 * instead of logging out left a permanent orphan row forever. Lazily
 * prunes anything past its TTL on read, so the file self-heals without a
 * separate cron job. */
function all(): AuthSession[] {
  const sessions = readJson<AuthSession[]>(FILE, []);
  const now = Date.now();
  const fresh = sessions.filter((s) => now - new Date(s.createdAt).getTime() < SESSION_TTL_MS);
  if (fresh.length !== sessions.length) writeJson(FILE, fresh);
  return fresh;
}

export function createSession(userId: string, username: string): string {
  const sessions = all();
  const token = crypto.randomBytes(32).toString("hex");
  sessions.push({ token, userId, username, createdAt: new Date().toISOString() });
  writeJson(FILE, sessions);
  return token;
}

export function getSession(token: string): AuthSession | null {
  if (!token) return null;
  return all().find((s) => s.token === token) ?? null;
}

export function deleteSession(token: string) {
  writeJson(
    FILE,
    all().filter((s) => s.token !== token),
  );
}

export function deleteSessionsForUser(userId: string) {
  writeJson(
    FILE,
    all().filter((s) => s.userId !== userId),
  );
}
