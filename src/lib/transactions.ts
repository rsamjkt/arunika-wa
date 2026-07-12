import { readJson, writeJson } from "./store";
import { getPlan } from "./plans";
import { activateSubscription, getFullUser } from "./users";
import { paymentConfirmedEmail, sendEmail } from "./email";

export type Transaction = {
  orderId: string;
  userId: string;
  planId: string;
  amount: number;
  totalAmount: number;
  signature: string;
  status: "PENDING" | "PAID" | "EXPIRED";
  qrisImage: string;
  expiredAt: string;
  createdAt: string;
  paidAt: string | null;
};

const FILE = "transactions.json";

function all(): Transaction[] {
  return readJson<Transaction[]>(FILE, []);
}

export function createTransactionRecord(tx: Omit<Transaction, "status" | "paidAt">): Transaction {
  const record: Transaction = { ...tx, status: "PENDING", paidAt: null };
  const list = all();
  list.push(record);
  writeJson(FILE, list);
  return record;
}

export function getTransaction(orderId: string): Transaction | null {
  return all().find((t) => t.orderId === orderId) ?? null;
}

export function listTransactionsForUser(userId: string): Transaction[] {
  return all()
    .filter((t) => t.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function markTransactionStatus(orderId: string, status: Transaction["status"], paidAt?: string) {
  const list = all();
  writeJson(
    FILE,
    list.map((t) => (t.orderId === orderId ? { ...t, status, paidAt: paidAt ?? t.paidAt } : t)),
  );
}

/** Idempotent: activates the tenant's subscription from a paid transaction.
 * Safe to call more than once (e.g. webhook + status-poll fallback both firing). */
export function activateFromPaidTransaction(orderId: string, paidAt?: string): boolean {
  const tx = getTransaction(orderId);
  if (!tx) return false;
  if (tx.status === "PAID") return true; // already processed
  const plan = getPlan(tx.planId);
  if (!plan) return false;

  markTransactionStatus(orderId, "PAID", paidAt ?? new Date().toISOString());
  const expiresAt = plan.durationDays
    ? new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  activateSubscription(tx.userId, plan.id, expiresAt);

  const user = getFullUser(tx.userId);
  if (user?.email) {
    const { subject, html } = paymentConfirmedEmail(user.username, plan.name);
    sendEmail(user.email, subject, html).catch(() => {});
  }
  return true;
}

export function markTransactionExpired(orderId: string) {
  const tx = getTransaction(orderId);
  if (!tx || tx.status === "PAID") return;
  markTransactionStatus(orderId, "EXPIRED");
}
