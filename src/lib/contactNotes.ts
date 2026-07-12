import { readJson, writeJson } from "./store";

export type ContactNote = {
  tags: string[];
  note: string;
};

const FILE = "contact-notes.json";
const DEFAULTS: ContactNote = { tags: [], note: "" };

type Store = Record<string, ContactNote>;

function key(ownerId: string, session: string, contactId: string) {
  return `${ownerId}:${session}:${contactId}`;
}

function all(): Store {
  return readJson<Store>(FILE, {});
}

export function getContactNote(ownerId: string, session: string, contactId: string): ContactNote {
  return { ...DEFAULTS, ...all()[key(ownerId, session, contactId)] };
}

export function setContactNote(
  ownerId: string,
  session: string,
  contactId: string,
  patch: Partial<ContactNote>,
): ContactNote {
  const store = all();
  const current = { ...DEFAULTS, ...store[key(ownerId, session, contactId)] };
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  const next = { ...current, ...defined };
  store[key(ownerId, session, contactId)] = next;
  writeJson(FILE, store);
  return next;
}
