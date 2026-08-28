import { readJson, writeJson } from "./store";

// Throttle login notifications so a user (and the admin) aren't emailed on
// every single sign-in. We notify only on a "meaningful" login: the first
// login of a new WIB day for that user, or a login from an IP not yet seen
// that day. State lives in data/login-notify.json, keyed by userId.
const FILE = "login-notify.json";

type Entry = { day: string; ips: string[] };
type Store = Record<string, Entry>;

/** WIB (UTC+7) calendar date — resets throttle at local midnight, not UTC. */
function wibDateKey(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Returns true (and records) when this login should trigger a notification. */
export function shouldNotifyLogin(userId: string, ip: string): boolean {
  const store = readJson<Store>(FILE, {});
  const today = wibDateKey();
  const entry = store[userId];

  if (!entry || entry.day !== today) {
    store[userId] = { day: today, ips: [ip] };
    writeJson(FILE, store);
    return true;
  }
  if (!entry.ips.includes(ip)) {
    entry.ips.push(ip);
    // keep the per-day IP list bounded
    if (entry.ips.length > 20) entry.ips = entry.ips.slice(-20);
    writeJson(FILE, store);
    return true;
  }
  return false;
}
