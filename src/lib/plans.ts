import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

export const FEATURE_KEYS = ["broadcast", "templates", "autoreply", "ai_autoreply", "apikeys", "webhook"] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  broadcast: "Broadcast / Campaign",
  templates: "Template Pesan",
  autoreply: "Auto-Reply Bot",
  ai_autoreply: "Balasan AI",
  apikeys: "API Key",
  webhook: "Webhook Keluar",
};

export type Plan = {
  id: string;
  name: string;
  priceRp: number;
  durationDays: number | null; // null = no expiry (Free)
  deviceLimit: number;
  monthlyMessageQuota: number | null; // null = unlimited
  features: FeatureKey[];
  isFree: boolean;
  createdAt: string;
};

const FILE = "plans.json";

function seed(): Plan[] {
  const free: Plan = {
    id: crypto.randomUUID(),
    name: "Free",
    priceRp: 0,
    durationDays: null,
    deviceLimit: 1,
    monthlyMessageQuota: 100,
    features: [],
    isFree: true,
    createdAt: new Date().toISOString(),
  };
  writeJson(FILE, [free]);
  return [free];
}

function all(): Plan[] {
  const plans = readJson<Plan[]>(FILE, []);
  return plans.length > 0 ? plans : seed();
}

export function listPlans(): Plan[] {
  return all().sort((a, b) => a.priceRp - b.priceRp);
}

export function getPlan(id: string): Plan | null {
  return all().find((p) => p.id === id) ?? null;
}

export function getFreePlan(): Plan {
  const plans = all();
  return plans.find((p) => p.isFree) ?? plans[0];
}

export function createPlan(input: Omit<Plan, "id" | "createdAt" | "isFree">): Plan {
  const plans = all();
  const plan: Plan = {
    id: crypto.randomUUID(),
    isFree: input.priceRp === 0,
    createdAt: new Date().toISOString(),
    ...input,
  };
  plans.push(plan);
  writeJson(FILE, plans);
  return plan;
}

export function updatePlan(id: string, patch: Partial<Omit<Plan, "id" | "createdAt">>): void {
  const plans = all();
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  writeJson(
    FILE,
    plans.map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, ...defined };
      // Always DERIVE isFree from the current price rather than trusting
      // whatever it was at creation — a plan repriced from 0 to a paid
      // amount via PATCH must stop being treated as free everywhere
      // (register/upgrade both branch on plan.isFree to skip payment
      // entirely), or it silently grants paid-tier access for Rp0.
      next.isFree = next.priceRp === 0;
      return next;
    }),
  );
}

export function deletePlan(id: string): void {
  const plans = all();
  const target = plans.find((p) => p.id === id);
  if (!target) throw new Error("Paket tidak ditemukan");
  if (target.isFree) throw new Error("Paket Free tidak bisa dihapus");
  writeJson(
    FILE,
    plans.filter((p) => p.id !== id),
  );
}

export function hasFeature(plan: Plan, key: FeatureKey): boolean {
  return plan.features.includes(key);
}
