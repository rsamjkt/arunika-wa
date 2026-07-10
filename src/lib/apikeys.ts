import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

export type ApiKeyRecord = {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
};

const FILE = "apikeys.json";
const TOUCH_THRESHOLD_MS = 60_000;

function seed(): ApiKeyRecord[] {
  const legacy = process.env.APP_API_KEY;
  if (!legacy) return [];
  const seeded: ApiKeyRecord = {
    id: crypto.randomUUID(),
    name: "Legacy Key (migrasi otomatis)",
    key: legacy,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revoked: false,
  };
  writeJson(FILE, [seeded]);
  return [seeded];
}

function all(): ApiKeyRecord[] {
  const keys = readJson<ApiKeyRecord[]>(FILE, []);
  return keys.length > 0 ? keys : seed();
}

export function listApiKeys(): ApiKeyRecord[] {
  return all();
}

export function createApiKey(name: string): ApiKeyRecord {
  const keys = all();
  const record: ApiKeyRecord = {
    id: crypto.randomUUID(),
    name: name.trim() || "Tanpa nama",
    key: crypto.randomBytes(24).toString("hex"),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revoked: false,
  };
  keys.push(record);
  writeJson(FILE, keys);
  return record;
}

export function revokeApiKey(id: string) {
  const keys = all();
  const next = keys.map((k) => (k.id === id ? { ...k, revoked: true } : k));
  writeJson(FILE, next);
}

export function deleteApiKey(id: string) {
  writeJson(
    FILE,
    all().filter((k) => k.id !== id),
  );
}

export function validateApiKey(key: string): ApiKeyRecord | null {
  if (!key) return null;
  const keys = all();
  const found = keys.find((k) => k.key === key && !k.revoked);
  if (!found) return null;

  const lastUsed = found.lastUsedAt ? new Date(found.lastUsedAt).getTime() : 0;
  if (Date.now() - lastUsed > TOUCH_THRESHOLD_MS) {
    found.lastUsedAt = new Date().toISOString();
    writeJson(FILE, keys);
  }
  return found;
}
