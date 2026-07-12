import crypto from "node:crypto";
import { readJson, writeJson } from "./store";
import { getFreePlan } from "./plans";

export type Role = "superadmin" | "tenant" | "tenant_staff";

export type QuotaUsage = { month: string; sent: number };

export type User = {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  passwordHash: string;
  salt: string;
  createdAt: string;
  role: Role;
  /** Set only for role==='tenant_staff' — the owning tenant's user id.
   * Staff share the owner's plan/quota/devices; null for everyone else. */
  tenantId: string | null;
  planId: string;
  subscriptionStatus: "active" | "pending_payment";
  subscriptionExpiresAt: string | null;
  quotaUsage: QuotaUsage;
  /** Superadmin-set kill switch — suspended tenants (and their staff,
   * via getGoverningUser) can't log in or use an existing session. */
  suspended: boolean;
};

/** Resolves the tenant whose plan/quota/devices actually govern this
 * user: themselves for owners/superadmin, their owner for staff. */
export function getEffectiveTenantId(user: User): string {
  return user.tenantId ?? user.id;
}

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
    email: null,
    phone: null,
    passwordHash: hashPassword(process.env.ADMIN_PASSWORD || "admin", salt),
    salt,
    createdAt: new Date().toISOString(),
    role: "superadmin",
    tenantId: null,
    planId: getFreePlan().id,
    subscriptionStatus: "active",
    subscriptionExpiresAt: null,
    quotaUsage: { month: currentMonth(), sent: 0 },
    suspended: false,
  };
  writeJson(FILE, [seeded]);
  return [seeded];
}

function migrate(users: User[]): User[] {
  let changed = false;
  const migrated = users.map((u) => {
    if (
      u.role &&
      u.planId &&
      u.subscriptionStatus &&
      u.quotaUsage &&
      "email" in u &&
      "phone" in u &&
      "tenantId" in u &&
      "suspended" in u
    )
      return u;
    changed = true;
    return {
      ...u,
      email: u.email ?? null,
      phone: u.phone ?? null,
      role: u.role ?? ("superadmin" as const),
      tenantId: u.tenantId ?? null,
      planId: u.planId ?? getFreePlan().id,
      subscriptionStatus: u.subscriptionStatus ?? ("active" as const),
      subscriptionExpiresAt: u.subscriptionExpiresAt ?? null,
      quotaUsage: u.quotaUsage ?? { month: currentMonth(), sent: 0 },
      suspended: u.suspended ?? false,
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
    email: null,
    phone: null,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
    role: "superadmin",
    tenantId: null,
    planId: getFreePlan().id,
    subscriptionStatus: "active",
    subscriptionExpiresAt: null,
    quotaUsage: { month: currentMonth(), sent: 0 },
    suspended: false,
  };
  users.push(user);
  writeJson(FILE, users);
  return toPublic(user);
}

/** Creates a self-registered tenant account. */
export function createTenant(
  username: string,
  password: string,
  email: string,
  phone: string | null,
  planId: string,
  subscriptionStatus: "active" | "pending_payment",
): PublicUser {
  const users = all();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("Username sudah dipakai");
  }
  if (users.some((u) => u.email && u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("Email sudah terdaftar");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const user: User = {
    id: crypto.randomUUID(),
    username,
    email,
    phone,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
    role: "tenant",
    tenantId: null,
    planId,
    subscriptionStatus,
    subscriptionExpiresAt: null,
    quotaUsage: { month: currentMonth(), sent: 0 },
    suspended: false,
  };
  users.push(user);
  writeJson(FILE, users);
  return toPublic(user);
}

/** Creates a staff login under an owning tenant — shares the owner's
 * plan, quota and devices. `email` is optional (needed only if the staff
 * member should be able to use forgot-password themselves). */
export function createStaff(
  ownerId: string,
  username: string,
  password: string,
  email: string | null,
): PublicUser {
  const users = all();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("Username sudah dipakai");
  }
  if (email && users.some((u) => u.email && u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("Email sudah terdaftar");
  }
  const owner = users.find((u) => u.id === ownerId);
  if (!owner || owner.role !== "tenant") throw new Error("Owner tidak ditemukan");
  const salt = crypto.randomBytes(16).toString("hex");
  const user: User = {
    id: crypto.randomUUID(),
    username,
    email,
    phone: null,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
    role: "tenant_staff",
    tenantId: ownerId,
    planId: owner.planId,
    subscriptionStatus: owner.subscriptionStatus,
    subscriptionExpiresAt: owner.subscriptionExpiresAt,
    quotaUsage: { month: currentMonth(), sent: 0 },
    suspended: false,
  };
  users.push(user);
  writeJson(FILE, users);
  return toPublic(user);
}

export function listStaffForTenant(ownerId: string): PublicUser[] {
  return all()
    .filter((u) => u.role === "tenant_staff" && u.tenantId === ownerId)
    .map(toPublic);
}

export function deleteUser(id: string) {
  const users = all();
  if (users.length <= 1) throw new Error("Minimal harus ada satu user");
  const next = users.filter((u) => u.id !== id);
  if (next.length === users.length) throw new Error("User tidak ditemukan");
  writeJson(FILE, next);
}

/** Removes a staff login — only if it actually belongs to `ownerId`. */
export function deleteStaff(ownerId: string, staffId: string) {
  const users = all();
  const staff = users.find((u) => u.id === staffId);
  if (!staff || staff.role !== "tenant_staff" || staff.tenantId !== ownerId) {
    throw new Error("Staf tidak ditemukan");
  }
  writeJson(FILE, users.filter((u) => u.id !== staffId));
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

export function findUserByEmail(email: string): User | null {
  return all().find((u) => u.email && u.email.toLowerCase() === email.toLowerCase()) ?? null;
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

export function suspendUser(userId: string) {
  const users = all();
  writeJson(FILE, users.map((u) => (u.id === userId ? { ...u, suspended: true } : u)));
}

export function reactivateUser(userId: string) {
  const users = all();
  writeJson(FILE, users.map((u) => (u.id === userId ? { ...u, suspended: false } : u)));
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

/** Tenants whose subscription expires within `days` days (and hasn't
 * already expired — that's listExpiredSubscriptions' job). */
export function listSubscriptionsExpiringSoon(days: number): User[] {
  const now = Date.now();
  const horizon = now + days * 24 * 60 * 60 * 1000;
  return all().filter(
    (u) =>
      u.role === "tenant" &&
      u.subscriptionStatus === "active" &&
      u.subscriptionExpiresAt &&
      new Date(u.subscriptionExpiresAt).getTime() > now &&
      new Date(u.subscriptionExpiresAt).getTime() <= horizon,
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

/** The record whose planId/quotaUsage actually governs `user` — the
 * owner's record for staff (who share the owner's plan/quota/devices),
 * `user` itself otherwise. */
export function getGoverningUser(user: User): User {
  if (!user.tenantId) return user;
  return all().find((u) => u.id === user.tenantId) ?? user;
}

/** The original platform-owner account — used to attribute legacy,
 * pre-multi-tenancy data (e.g. the migrated API key) on first read. */
export function getPrimarySuperadminId(): string {
  const users = all();
  return (users.find((u) => u.role === "superadmin") ?? users[0]).id;
}
