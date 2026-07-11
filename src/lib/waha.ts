const BASE_URL = process.env.WAHA_BASE_URL ?? "http://localhost:3000";
const API_KEY = process.env.WAHA_API_KEY ?? "";

export class WahaError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function waha(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "X-Api-Key": API_KEY,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  return res;
}

async function wahaJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await waha(path, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new WahaError(res.status, body || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export type SessionStatus =
  | "STOPPED"
  | "STARTING"
  | "SCAN_QR_CODE"
  | "WORKING"
  | "FAILED";

export interface SessionInfo {
  name: string;
  status: SessionStatus;
  me?: { id: string; pushName: string } | null;
  assignedWorker?: string;
}

export interface ChatSummary {
  id: string;
  name: string | null;
  picture: string | null;
  lastMessage: {
    body?: string;
    timestamp?: number;
    fromMe?: boolean;
  } | null;
}

export interface WAMessage {
  id: string;
  timestamp: number;
  from: string;
  fromMe: boolean;
  to: string;
  body: string;
  hasMedia?: boolean;
  ack?: number;
}

export function listSessions() {
  return wahaJson<SessionInfo[]>("/api/sessions?all=true");
}

export function getSession(session: string) {
  return wahaJson<SessionInfo>(`/api/sessions/${encodeURIComponent(session)}`);
}

export async function createSession(name: string) {
  const webhookSecret = process.env.WAHA_WEBHOOK_SECRET;
  const config = webhookSecret
    ? {
        webhooks: [
          {
            url: "http://127.0.0.1:4000/api/webhooks/waha",
            events: ["message", "message.ack", "session.status"],
            hmac: { key: webhookSecret },
          },
        ],
      }
    : undefined;

  try {
    return await wahaJson<SessionInfo>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ name, start: true, config }),
    });
  } catch (err) {
    // Session with this name already exists (e.g. it disconnected earlier) —
    // fall back to (re)starting it instead of failing, so reconnecting under
    // the same name just works.
    if (err instanceof WahaError && err.status === 422 && /already exists/i.test(err.message)) {
      return startSession(name);
    }
    throw err;
  }
}

export function startSession(session: string) {
  return wahaJson<SessionInfo>(
    `/api/sessions/${encodeURIComponent(session)}/start`,
    { method: "POST" },
  );
}

export function stopSession(session: string) {
  return wahaJson<SessionInfo>(
    `/api/sessions/${encodeURIComponent(session)}/stop`,
    { method: "POST" },
  );
}

export function restartSession(session: string) {
  return wahaJson<SessionInfo>(
    `/api/sessions/${encodeURIComponent(session)}/restart`,
    { method: "POST" },
  );
}

export function deleteSession(session: string) {
  return wahaJson<void>(`/api/sessions/${encodeURIComponent(session)}`, {
    method: "DELETE",
  });
}

export async function getQrPng(session: string): Promise<ArrayBuffer> {
  const res = await waha(
    `/api/${encodeURIComponent(session)}/auth/qr?format=image`,
  );
  if (!res.ok) {
    throw new WahaError(res.status, await res.text().catch(() => ""));
  }
  return res.arrayBuffer();
}

export function getChatsOverview(session: string, limit = 30) {
  return wahaJson<ChatSummary[]>(
    `/api/${encodeURIComponent(session)}/chats/overview?limit=${limit}&offset=0`,
  );
}

export function getMessages(session: string, chatId: string, limit = 50) {
  return wahaJson<WAMessage[]>(
    `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}&downloadMedia=false&sortOrder=desc`,
  );
}

export function sendText(session: string, chatId: string, text: string) {
  return wahaJson<WAMessage>("/api/sendText", {
    method: "POST",
    body: JSON.stringify({ session, chatId, text }),
  });
}

/** Either a remote URL or inline base64 data — WAHA accepts both shapes. */
export interface FileInput {
  mimetype: string;
  filename?: string;
  url?: string;
  data?: string;
}

export function sendImage(
  session: string,
  chatId: string,
  file: FileInput,
  caption?: string,
) {
  return wahaJson<WAMessage>("/api/sendImage", {
    method: "POST",
    body: JSON.stringify({ session, chatId, file, caption }),
  });
}

export function sendFile(
  session: string,
  chatId: string,
  file: FileInput,
  caption?: string,
) {
  return wahaJson<WAMessage>("/api/sendFile", {
    method: "POST",
    body: JSON.stringify({ session, chatId, file, caption }),
  });
}

export function sendVideo(
  session: string,
  chatId: string,
  file: FileInput,
  caption?: string,
) {
  return wahaJson<WAMessage>("/api/sendVideo", {
    method: "POST",
    body: JSON.stringify({ session, chatId, file, caption, convert: true }),
  });
}

export function sendVoice(session: string, chatId: string, file: FileInput) {
  return wahaJson<WAMessage>("/api/sendVoice", {
    method: "POST",
    body: JSON.stringify({ session, chatId, file, convert: true }),
  });
}

export function sendLocation(
  session: string,
  chatId: string,
  latitude: number,
  longitude: number,
  title: string,
) {
  return wahaJson<WAMessage>("/api/sendLocation", {
    method: "POST",
    body: JSON.stringify({ session, chatId, latitude, longitude, title }),
  });
}

export function sendLinkPreview(
  session: string,
  chatId: string,
  url: string,
  title: string,
) {
  return wahaJson<WAMessage>("/api/sendLinkPreview", {
    method: "POST",
    body: JSON.stringify({ session, chatId, url, title }),
  });
}

export interface VCardContact {
  vcard: string;
}

export function sendContactVcard(
  session: string,
  chatId: string,
  contacts: VCardContact[],
) {
  return wahaJson<WAMessage>("/api/sendContactVcard", {
    method: "POST",
    body: JSON.stringify({ session, chatId, contacts }),
  });
}

/* ================= Contacts ================= */

export interface WAContact {
  id: string;
  name?: string;
  pushname?: string;
  number?: string;
  isMyContact?: boolean;
  isBusiness?: boolean;
}

export function getAllContacts(session: string, limit = 50, offset = 0) {
  return wahaJson<WAContact[]>(
    `/api/contacts/all?session=${encodeURIComponent(session)}&limit=${limit}&offset=${offset}`,
  );
}

export function getContact(session: string, contactId: string) {
  return wahaJson<WAContact>(
    `/api/contacts?contactId=${encodeURIComponent(contactId)}&session=${encodeURIComponent(session)}`,
  );
}

export function checkNumberExists(session: string, phone: string) {
  return wahaJson<{ numberExists: boolean; chatId?: string }>(
    `/api/contacts/check-exists?phone=${encodeURIComponent(phone)}&session=${encodeURIComponent(session)}`,
  );
}

export async function getContactPicture(
  session: string,
  contactId: string,
): Promise<string | null> {
  const data = await wahaJson<{ profilePictureURL?: string }>(
    `/api/contacts/profile-picture?contactId=${encodeURIComponent(contactId)}&session=${encodeURIComponent(session)}`,
  ).catch(() => null);
  return data?.profilePictureURL ?? null;
}

export function getContactAbout(session: string, contactId: string) {
  return wahaJson<{ about?: string }>(
    `/api/contacts/about?contactId=${encodeURIComponent(contactId)}&session=${encodeURIComponent(session)}`,
  );
}

export function blockContact(session: string, contactId: string) {
  return wahaJson<void>("/api/contacts/block", {
    method: "POST",
    body: JSON.stringify({ session, contactId }),
  });
}

export function unblockContact(session: string, contactId: string) {
  return wahaJson<void>("/api/contacts/unblock", {
    method: "POST",
    body: JSON.stringify({ session, contactId }),
  });
}

/* ================= Groups ================= */

export interface Participant {
  id: string;
}

export interface WAGroup {
  id: string;
  name?: string;
  subject?: string;
  participants?: Participant[];
}

export function listGroups(session: string, limit = 50, offset = 0) {
  return wahaJson<WAGroup[]>(
    `/api/${encodeURIComponent(session)}/groups?limit=${limit}&offset=${offset}`,
  );
}

export function getGroup(session: string, id: string) {
  return wahaJson<WAGroup>(`/api/${encodeURIComponent(session)}/groups/${encodeURIComponent(id)}`);
}

export function createGroup(session: string, name: string, participants: Participant[]) {
  return wahaJson<WAGroup>(`/api/${encodeURIComponent(session)}/groups`, {
    method: "POST",
    body: JSON.stringify({ name, participants }),
  });
}

export function getGroupParticipants(session: string, id: string) {
  return wahaJson<Participant[]>(
    `/api/${encodeURIComponent(session)}/groups/${encodeURIComponent(id)}/participants`,
  );
}

export function addGroupParticipants(session: string, id: string, participants: Participant[]) {
  return wahaJson<void>(
    `/api/${encodeURIComponent(session)}/groups/${encodeURIComponent(id)}/participants/add`,
    { method: "POST", body: JSON.stringify({ participants }) },
  );
}

export function removeGroupParticipants(session: string, id: string, participants: Participant[]) {
  return wahaJson<void>(
    `/api/${encodeURIComponent(session)}/groups/${encodeURIComponent(id)}/participants/remove`,
    { method: "POST", body: JSON.stringify({ participants }) },
  );
}

export function leaveGroup(session: string, id: string) {
  return wahaJson<void>(
    `/api/${encodeURIComponent(session)}/groups/${encodeURIComponent(id)}/leave`,
    { method: "POST" },
  );
}

/* ================= Message actions ================= */

export function setReaction(session: string, messageId: string, reaction: string) {
  return wahaJson<void>("/api/reaction", {
    method: "PUT",
    body: JSON.stringify({ session, messageId, reaction }),
  });
}

export function starMessage(
  session: string,
  chatId: string,
  messageId: string,
  star: boolean,
) {
  return wahaJson<void>("/api/star", {
    method: "PUT",
    body: JSON.stringify({ session, chatId, messageId, star }),
  });
}

export function sendSeen(session: string, chatId: string, messageIds?: string[]) {
  return wahaJson<void>("/api/sendSeen", {
    method: "POST",
    body: JSON.stringify({ session, chatId, messageIds }),
  });
}

export function setTyping(session: string, chatId: string, state: "start" | "stop") {
  return wahaJson<void>(state === "start" ? "/api/startTyping" : "/api/stopTyping", {
    method: "POST",
    body: JSON.stringify({ session, chatId }),
  });
}

export function replyMessage(
  session: string,
  chatId: string,
  replyTo: string,
  text: string,
) {
  return wahaJson<WAMessage>("/api/reply", {
    method: "POST",
    body: JSON.stringify({ session, chatId, reply_to: replyTo, text }),
  });
}

export function forwardMessage(session: string, chatId: string, messageId: string) {
  return wahaJson<WAMessage>("/api/forwardMessage", {
    method: "POST",
    body: JSON.stringify({ session, chatId, messageId }),
  });
}

export function deleteMessage(session: string, chatId: string, messageId: string) {
  return wahaJson<void>(
    `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`,
    { method: "DELETE" },
  );
}

export function pinMessage(
  session: string,
  chatId: string,
  messageId: string,
  duration: number,
) {
  return wahaJson<void>(
    `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/pin`,
    { method: "POST", body: JSON.stringify({ duration }) },
  );
}

export function unpinMessage(session: string, chatId: string, messageId: string) {
  return wahaJson<void>(
    `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/unpin`,
    { method: "POST" },
  );
}

/* ================= Profile ================= */

export interface WAProfile {
  id: string;
  name?: string;
  status?: string;
  pictureUrl?: string | null;
}

export function getProfile(session: string) {
  return wahaJson<WAProfile>(`/api/${encodeURIComponent(session)}/profile`);
}

export function setProfileName(session: string, name: string) {
  return wahaJson<void>(`/api/${encodeURIComponent(session)}/profile/name`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export function setProfileStatus(session: string, status: string) {
  return wahaJson<void>(`/api/${encodeURIComponent(session)}/profile/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

/* ================= Server ================= */

export function getServerStatus() {
  return wahaJson<Record<string, unknown>>("/api/server/status");
}

export function getServerVersion() {
  return wahaJson<{ version: string; engine?: string }>("/api/server/version");
}

/* ================= Labels ================= */

export interface WALabel {
  id: string;
  name: string;
  color?: number;
}

export function getLabels(session: string) {
  return wahaJson<WALabel[]>(`/api/${encodeURIComponent(session)}/labels`);
}

export function getChatLabels(session: string, chatId: string) {
  return wahaJson<WALabel[]>(
    `/api/${encodeURIComponent(session)}/labels/chats/${encodeURIComponent(chatId)}`,
  );
}
