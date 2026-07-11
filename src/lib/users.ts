import crypto from "node:crypto";
import { readJson, writeJson } from "./store";
import { getFreePlan } from "./plans";

export type Role = "superadmin" | "tenant";

export type QuotaUsage = { month: string; sent: number };

export type User = {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  role: Role;
  planId: string;
  subscriptionStatus: "active" | "pending_payment";
  subscriptionExpiresAt: string | null;
  quotaUsage: QuotaUsage;
};

export type PublicUser = Omit<User, "passwordHash" | "salt">;

const FILE = "users.json";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function seed(): User[] {
  const salt = crypto.randomBytes(16).toString("hex");
  const seeded: User = {
    id: crypto.randomUUID(),
    username: process.env.ADMIN_USERNAME || "admin",
    passwordHash: hashPassword(process.env.ADMIN_PASSWORD || "admin", salt),
    salt,
    createdAt: new Date().toISOString(),
    role: "superadmin",
    planId: getFreePlan().id,
    subscriptionStatus: "active",
    subscriptionExpiresAt: null,
    quotaUsage: { month: currentMonth(), sent: 0 },
  };
  writeJson(FILE, [seeded]);
  return [seeded];
}

function migrate(users: User[]): User[] {
  let changed = false;
  const migrated = users.map((u) => {
    if (u.role && u.planId && u.subscriptionStatus && u.quotaUsage) return u;
    changed = true;
    return {
      ...u,
      role: u.role ?? ("superadmin" as const),
      planId: u.planId ?? getFreePlan().id,
      subscriptionStatus: u.subscriptionStatus ?? ("active" as const),
      subscriptionExpiresAt: u.subscriptionExpiresAt ?? null,
      quotaUsage: u.quotaUsage ?? { month: currentMonth(), sent: 0 },
    };
  });
  if (changed) writeJson(FILE, migrated);
  return migrated;
}

function all(): User[] {
  const users = readJson<User[]>(FILE, []);
  return users.length > 0 ? migrate(users) : seed();
}

function toPublic({ passwordHash, salt, ...rest }: User): PublicUser {
  return rest;
}

export function listUsers(): PublicUser[] {
  return all().map(toPublic);
}

export function verifyLogin(username: string, password: string): User | null {
  const user = all().find((u) => u.username === username);
  if (!user) return null;
  const hash = hashPassword(password, user.salt);
  return safeEqual(hash, user.passwordHash) ? user : null;
}

/** Creates a platform-staff (superadmin) account — used by Settings > Manajemen User. */
export function createUser(username: string, password: string): PublicUser {
  const users = all();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("Username sudah dipakai");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const user: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
    role: "superadmin",
    planId: getFreePlan().id,
    subscriptionStatus: "active",
    subscriptionExpiresAt: null,
    quotaUsage: { month: currentMonth(), sent: 0 },
  };
  users.push(user);
  writeJson(FILE, users);
  return toPublic(user);
}

/** Creates a self-registered tenant account. */
export function createTenant(
  username: string,
  password: string,
  planId: string,
  subscriptionStatus: "active" | "pending_payment",
): PublicUser {
  const users = all();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("Username sudah dipakai");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const user: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
    role: "tenant",
    planId,
    subscriptionStatus,
    subscriptionExpiresAt: null,
    quotaUsage: { month: currentMonth(), sent: 0 },
  };
  users.push(user);
  writeJson(FILE, users);
  return toPublic(user);
}

export function deleteUser(id: string) {
  const users = all();
  if (users.length <= 1) throw new Error("Minimal harus ada satu user");
  const next = users.filter((u) => u.id !== id);
  if (next.length === users.length) throw new Error("User tidak ditemukan");
  writeJson(FILE, next);
}

export function changePassword(id: string, password: string) {
  const users = all();
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error("User tidak ditemukan");
  const salt = crypto.randomBytes(16).toString("hex");
  user.salt = salt;
  user.passwordHash = hashPassword(password, salt);
  writeJson(FILE, users);
}

export function findUserById(id: string): PublicUser | null {
  const user = all().find((u) => u.id === id);
  return user ? toPublic(user) : null;
}

export function listTenants(): PublicUser[] {
  return all()
    .filter((u) => u.role === "tenant")
    .map(toPublic);
}

export function activateSubscription(userId: string, planId: string, expiresAt: string | null) {
  const users = all();
  writeJson(
    FILE,
    users.map((u) =>
      u.id === userId ? { ...u, planId, subscriptionStatus: "active" as const, subscriptionExpiresAt: expiresAt } : u,
    ),
  );
}

export function downgradeToFree(userId: string) {
  const users = all();
  const free = getFreePlan();
  writeJson(
    FILE,
    users.map((u) =>
      u.id === userId
        ? { ...u, planId: free.id, subscriptionStatus: "active" as const, subscriptionExpiresAt: null }
        : u,
    ),
  );
}

export function listExpiredSubscriptions(): User[] {
  const now = Date.now();
  return all().filter(
    (u) =>
      u.role === "tenant" &&
      u.subscriptionStatus === "active" &&
      u.subscriptionExpiresAt &&
      new Date(u.subscriptionExpiresAt).getTime() < now,
  );
}

export function getEffectiveQuotaUsage(userId: string): number {
  const user = all().find((u) => u.id === userId);
  if (!user) return 0;
  return user.quotaUsage.month === currentMonth() ? user.quotaUsage.sent : 0;
}

export function incrementQuotaUsage(userId: string, by = 1) {
  const users = all();
  writeJson(
    FILE,
    users.map((u) => {
      if (u.id !== userId) return u;
      const month = currentMonth();
      const sent = u.quotaUsage.month === month ? u.quotaUsage.sent + by : by;
      return { ...u, quotaUsage: { month, sent } };
    }),
  );
}

export function getFullUser(id: string): User | null {
  return all().find((u) => u.id === id) ?? null;
}

/** The original platform-owner account — used to attribute legacy,
 * pre-multi-tenancy data (e.g. the migrated API key) on first read. */
export function getPrimarySuperadminId(): string {
  const users = all();
  return (users.find((u) => u.role === "superadmin") ?? users[0]).id;
}
