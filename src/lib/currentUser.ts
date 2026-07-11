import { cookies, headers } from "next/headers";
import { getSession } from "./sessions";
import { getFullUser } from "./users";
import { validateApiKey } from "./apikeys";

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get("arunika_session")?.value;
  if (!token) return null;
  return getSession(token);
}

/** Session (cookie) OR X-Api-Key → full account record (role, plan,
 * subscription). Route handlers reachable by external API callers must
 * use this instead of getCurrentUser(), or a tenant's own API key won't
 * resolve to their account. */
export async function getCurrentFullUser() {
  const session = await getCurrentUser();
  if (session) return getFullUser(session.userId);

  const h = await headers();
  const apiKey = h.get("x-api-key");
  if (apiKey) {
    const record = validateApiKey(apiKey);
    if (record) return getFullUser(record.ownerId);
  }
  return null;
}
