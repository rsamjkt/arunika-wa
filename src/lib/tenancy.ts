import { NextResponse } from "next/server";
import { readJson, writeJson } from "./store";
import { getCurrentFullUser } from "./currentUser";
import { getEffectiveTenantId, type User } from "./users";

const FILE = "session-owners.json";

function all(): Record<string, string> {
  return readJson<Record<string, string>>(FILE, {});
}

export function getSessionOwner(sessionName: string): string | null {
  return all()[sessionName] ?? null;
}

export function getOwnedSessionNames(userId: string): string[] {
  const owners = all();
  return Object.entries(owners)
    .filter(([, ownerId]) => ownerId === userId)
    .map(([session]) => session);
}

export function countOwnedSessions(userId: string): number {
  return getOwnedSessionNames(userId).length;
}

export function recordSessionOwner(sessionName: string, userId: string) {
  const owners = all();
  owners[sessionName] = userId;
  writeJson(FILE, owners);
}

export function releaseSessionOwner(sessionName: string) {
  const owners = all();
  delete owners[sessionName];
  writeJson(FILE, owners);
}

export class NotOwnerError extends Error {
  constructor(sessionName: string) {
    super(`Anda tidak memiliki akses ke perangkat "${sessionName}"`);
  }
}

/** Superadmins bypass ownership checks (platform-wide visibility). */
export function assertOwnsSession(userId: string, role: string, sessionName: string) {
  if (role === "superadmin") return;
  const owner = getSessionOwner(sessionName);
  if (owner !== userId) {
    throw new NotOwnerError(sessionName);
  }
}

/** Route-handler guard: 401 if not logged in, 403 if the session belongs to
 * someone else. Use at the top of every session-scoped route, including the
 * send-text/message-reply/etc routes that carry `session` in the body. */
export async function requireSessionAccess(
  sessionName: string,
): Promise<{ user: User | null; response: NextResponse | null }> {
  const user = await getCurrentFullUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  try {
    assertOwnsSession(getEffectiveTenantId(user), user.role, sessionName);
  } catch {
    return {
      user,
      response: NextResponse.json({ error: "Anda tidak memiliki akses ke perangkat ini" }, { status: 403 }),
    };
  }
  return { user, response: null };
}
