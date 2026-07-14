import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

export type NotificationType = "chat_assigned" | "campaign_completed" | "webhook_failing" | "quota_near_limit";

export type Notification = {
  id: string;
  userId: string; // the specific person who should see it (tenant owner or a staff member's own id)
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const FILE = "notifications.json";
const MAX_ENTRIES = 2000;

function all(): Notification[] {
  return readJson<Notification[]>(FILE, []);
}

function save(list: Notification[]) {
  writeJson(FILE, list.length > MAX_ENTRIES ? list.slice(list.length - MAX_ENTRIES) : list);
}

export function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
): Notification {
  const notification: Notification = {
    id: crypto.randomUUID(),
    userId,
    type,
    title,
    body,
    link: link ?? null,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const list = all();
  list.push(notification);
  save(list);
  return notification;
}

export function listNotificationsFor(userId: string, limit = 30): Notification[] {
  return all()
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function countUnread(userId: string): number {
  return all().filter((n) => n.userId === userId && !n.read).length;
}

export function markAsRead(userId: string, id: string): void {
  save(all().map((n) => (n.id === id && n.userId === userId ? { ...n, read: true } : n)));
}

export function markAllAsRead(userId: string): void {
  save(all().map((n) => (n.userId === userId ? { ...n, read: true } : n)));
}

/** Has this user already gotten a notification of this type since `since`?
 * Used to dedupe recurring conditions (quota near limit, webhook still
 * failing) so they fire once per episode instead of on every check. */
export function hasRecentNotification(userId: string, type: NotificationType, since: Date): boolean {
  return all().some((n) => n.userId === userId && n.type === type && new Date(n.createdAt) >= since);
}

/** Cascade delete — used when a tenant account (or a staff member) is removed. */
export function deleteNotificationsForUser(userId: string): void {
  save(all().filter((n) => n.userId !== userId));
}
