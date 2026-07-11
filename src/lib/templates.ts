import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

export type MessageTemplate = {
  id: string;
  name: string;
  category: string;
  body: string;
  createdAt: string;
  usedCount: number;
};

const FILE = "templates.json";

export function listTemplates(): MessageTemplate[] {
  return readJson<MessageTemplate[]>(FILE, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getTemplate(id: string): MessageTemplate | null {
  return readJson<MessageTemplate[]>(FILE, []).find((t) => t.id === id) ?? null;
}

export function createTemplate(name: string, category: string, body: string): MessageTemplate {
  const templates = readJson<MessageTemplate[]>(FILE, []);
  const template: MessageTemplate = {
    id: crypto.randomUUID(),
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
  id: string,
  patch: Partial<Pick<MessageTemplate, "name" | "category" | "body">>,
): void {
  const templates = readJson<MessageTemplate[]>(FILE, []);
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  writeJson(
    FILE,
    templates.map((t) => (t.id === id ? { ...t, ...defined } : t)),
  );
}

export function deleteTemplate(id: string): void {
  const templates = readJson<MessageTemplate[]>(FILE, []);
  writeJson(
    FILE,
    templates.filter((t) => t.id !== id),
  );
}

export function incrementUsage(id: string, by = 1): void {
  const templates = readJson<MessageTemplate[]>(FILE, []);
  writeJson(
    FILE,
    templates.map((t) => (t.id === id ? { ...t, usedCount: t.usedCount + by } : t)),
  );
}
