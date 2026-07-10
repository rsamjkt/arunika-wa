import { cookies } from "next/headers";
import { getSession } from "./sessions";

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get("arunika_session")?.value;
  if (!token) return null;
  return getSession(token);
}
