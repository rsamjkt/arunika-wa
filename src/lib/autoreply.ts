import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

export type KeywordRule = {
  id: string;
  keywords: string[];
  reply: string;
  enabled: boolean;
};

export type AutoReplySettings = {
  enabled: boolean;
  welcomeEnabled: boolean;
  welcomeMessage: string;
  businessHours: {
    enabled: boolean;
    days: number[]; // 0=Sun..6=Sat, in WIB (Asia/Jakarta, UTC+7)
    start: string; // "HH:MM"
    end: string; // "HH:MM"
  };
  outsideHoursEnabled: boolean;
  outsideHoursMessage: string;
  rules: KeywordRule[];
};

const FILE = "autoreply.json";
const SEEN_FILE = "seen-contacts.json";

const DEFAULTS: AutoReplySettings = {
  enabled: false,
  welcomeEnabled: false,
  welcomeMessage: "Halo! Terima kasih sudah menghubungi kami. Tim kami akan segera membalas pesan Anda.",
  businessHours: { enabled: false, days: [1, 2, 3, 4, 5, 6], start: "08:00", end: "17:00" },
  outsideHoursEnabled: false,
  outsideHoursMessage:
    "Terima kasih telah menghubungi kami! Saat ini kami sedang di luar jam operasional. Pesan Anda akan kami balas secepatnya.",
  rules: [],
};

export function getSettings(): AutoReplySettings {
  const stored = readJson<Partial<AutoReplySettings>>(FILE, DEFAULTS);
  return {
    ...DEFAULTS,
    ...stored,
    businessHours: { ...DEFAULTS.businessHours, ...stored.businessHours },
  };
}

export function updateSettings(patch: Partial<AutoReplySettings>): AutoReplySettings {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  const next = { ...getSettings(), ...defined };
  writeJson(FILE, next);
  return next;
}

export function createRule(keywords: string[], reply: string): KeywordRule {
  const settings = getSettings();
  const rule: KeywordRule = { id: crypto.randomUUID(), keywords, reply, enabled: true };
  settings.rules.push(rule);
  writeJson(FILE, settings);
  return rule;
}

export function updateRule(id: string, patch: Partial<Omit<KeywordRule, "id">>): void {
  const settings = getSettings();
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  settings.rules = settings.rules.map((r) => (r.id === id ? { ...r, ...defined } : r));
  writeJson(FILE, settings);
}

export function deleteRule(id: string): void {
  const settings = getSettings();
  settings.rules = settings.rules.filter((r) => r.id !== id);
  writeJson(FILE, settings);
}

function wibNow(): Date {
  return new Date(Date.now() + 7 * 60 * 60 * 1000);
}

export function isWithinBusinessHours(settings: AutoReplySettings): boolean {
  if (!settings.businessHours.enabled) return true;
  const now = wibNow();
  const day = now.getUTCDay();
  if (!settings.businessHours.days.includes(day)) return false;
  const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes();
  const [startH, startM] = settings.businessHours.start.split(":").map(Number);
  const [endH, endM] = settings.businessHours.end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return minutesNow >= startMinutes && minutesNow < endMinutes;
}

export function matchKeywordRule(settings: AutoReplySettings, text: string): KeywordRule | null {
  const lower = text.toLowerCase();
  for (const rule of settings.rules) {
    if (!rule.enabled) continue;
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) return rule;
  }
  return null;
}

function seenStore(): Record<string, string[]> {
  return readJson<Record<string, string[]>>(SEEN_FILE, {});
}

export function hasSeenContact(session: string, chatId: string): boolean {
  const store = seenStore();
  return (store[session] ?? []).includes(chatId);
}

export function markSeenContact(session: string, chatId: string): void {
  const store = seenStore();
  const list = store[session] ?? [];
  if (!list.includes(chatId)) {
    store[session] = [...list, chatId];
    writeJson(SEEN_FILE, store);
  }
}
