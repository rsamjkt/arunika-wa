import { readJson, writeJson } from "./store";

const FILE = "reminders-sent.json";

function all(): string[] {
  return readJson<string[]>(FILE, []);
}

export function hasBeenReminded(key: string): boolean {
  return all().includes(key);
}

export function markReminded(key: string) {
  const list = all();
  if (!list.includes(key)) {
    list.push(key);
    // Keep this bounded — old keys (past expiry dates) are harmless but
    // pointless to keep forever.
    writeJson(FILE, list.length > 2000 ? list.slice(list.length - 2000) : list);
  }
}
