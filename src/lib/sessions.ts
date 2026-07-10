import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

export type AuthSession = {
  token: string;
  userId: string;
  username: string;
  createdAt: string;
};

const FILE = "web-sessions.json";

function all(): AuthSession[] {
  return readJson<AuthSession[]>(FILE, []);
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
