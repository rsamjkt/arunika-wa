import { readJson, writeJson } from "./store";

export type ChatAssignment = {
  assignedTo: string | null;
  status: "open" | "resolved";
};

const FILE = "chat-assignments.json";
const DEFAULTS: ChatAssignment = { assignedTo: null, status: "open" };

type Store = Record<string, ChatAssignment>;

function key(ownerId: string, session: string, chatId: string) {
  return `${ownerId}:${session}:${chatId}`;
}

function all(): Store {
  return readJson<Store>(FILE, {});
}

export function getAssignment(ownerId: string, session: string, chatId: string): ChatAssignment {
  return { ...DEFAULTS, ...all()[key(ownerId, session, chatId)] };
}

/** All assignments for a session, keyed by bare chatId — used to
 * populate the Inbox chat list without one lookup per row. */
export function listAssignmentsForSession(ownerId: string, session: string): Record<string, ChatAssignment> {
  const prefix = `${ownerId}:${session}:`;
  const out: Record<string, ChatAssignment> = {};
  for (const [k, v] of Object.entries(all())) {
    if (k.startsWith(prefix)) out[k.slice(prefix.length)] = { ...DEFAULTS, ...v };
  }
  return out;
}

export function setAssignment(
  ownerId: string,
  session: string,
  chatId: string,
  patch: Partial<ChatAssignment>,
): ChatAssignment {
  const store = all();
  const current = { ...DEFAULTS, ...store[key(ownerId, session, chatId)] };
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  const next = { ...current, ...defined };
  store[key(ownerId, session, chatId)] = next;
  writeJson(FILE, store);
  return next;
}

/** Cascade delete — used when a tenant account is removed entirely. */
export function deleteAllForOwner(ownerId: string): void {
  const store = all();
  const prefix = `${ownerId}:`;
  const next = Object.fromEntries(Object.entries(store).filter(([k]) => !k.startsWith(prefix)));
  writeJson(FILE, next);
}
