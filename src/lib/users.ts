import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

export type User = {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

export type PublicUser = Omit<User, "passwordHash" | "salt">;

const FILE = "users.json";

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
  };
  writeJson(FILE, [seeded]);
  return [seeded];
}

function all(): User[] {
  const users = readJson<User[]>(FILE, []);
  return users.length > 0 ? users : seed();
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
