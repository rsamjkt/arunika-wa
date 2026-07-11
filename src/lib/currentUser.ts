import { cookies } from "next/headers";
import { getSession } from "./sessions";
import { getFullUser } from "./users";

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get("arunika_session")?.value;
  if (!token) return null;
  return getSession(token);
}

/** Session + full account record (role, plan, subscription) in one call. */
export async function getCurrentFullUser() {
  const session = await getCurrentUser();
  if (!session) return null;
  return getFullUser(session.userId);
}
