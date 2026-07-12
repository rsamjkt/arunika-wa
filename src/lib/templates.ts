import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

export type MessageTemplate = {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  body: string;
  createdAt: string;
  usedCount: number;
};

const FILE = "templates.json";

function all(): MessageTemplate[] {
  return readJson<MessageTemplate[]>(FILE, []);
}

export function listTemplates(ownerId: string): MessageTemplate[] {
  return all()
    .filter((t) => t.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getTemplate(ownerId: string, id: string): MessageTemplate | null {
  return all().find((t) => t.id === id && t.ownerId === ownerId) ?? null;
}

export function createTemplate(ownerId: string, name: string, category: string, body: string): MessageTemplate {
  const templates = all();
  const template: MessageTemplate = {
    id: crypto.randomUUID(),
    ownerId,
    name,
    category: category || "Umum",
    body,
    createdAt: new Date().toISOString(),
    usedCount: 0,
  };
  templates.push(template);
  writeJson(FILE, templates);
  return template;
}

export function updateTemplate(
  ownerId: string,
  id: string,
  patch: Partial<Pick<MessageTemplate, "name" | "category" | "body">>,
): void {
  const templates = all();
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  writeJson(
    FILE,
    templates.map((t) => (t.id === id && t.ownerId === ownerId ? { ...t, ...defined } : t)),
  );
}

export function deleteTemplate(ownerId: string, id: string): void {
  const templates = all();
  writeJson(
    FILE,
    templates.filter((t) => !(t.id === id && t.ownerId === ownerId)),
  );
}

/** Cascade delete — used when a tenant account is removed entirely. */
export function deleteAllForOwner(ownerId: string): void {
  writeJson(FILE, all().filter((t) => t.ownerId !== ownerId));
}

/** Internal side effect (called after a successful send) — not user-facing,
 * so it doesn't re-verify ownership; the templateId already came from a
 * campaign/send the caller owns. */
export function incrementUsage(id: string, by = 1): void {
  const templates = all();
  writeJson(
    FILE,
    templates.map((t) => (t.id === id ? { ...t, usedCount: t.usedCount + by } : t)),
  );
}
