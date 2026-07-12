import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

export type LeadCategory = "company" | "school" | "hospital";
export type LeadSource = "google_places" | "csv";
export type LeadStatus = "new" | "contacted" | "failed" | "opted_out";

export type Lead = {
  id: string;
  name: string;
  category: LeadCategory;
  area: string;
  address: string | null;
  phone: string | null; // E.164-ish, digits only, ready for "@c.us"
  email: string | null;
  website: string | null;
  source: LeadSource;
  placeId: string | null; // dedup key for google_places-sourced leads
  status: LeadStatus;
  lastError: string | null;
  contactedAt: string | null;
  createdAt: string;
};

const FILE = "leads.json";

function all(): Lead[] {
  return readJson<Lead[]>(FILE, []);
}

function save(leads: Lead[]) {
  writeJson(FILE, leads);
}

export function listLeads(): Lead[] {
  return all().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findLeadByPlaceId(placeId: string): Lead | null {
  return all().find((l) => l.placeId === placeId) ?? null;
}

export function findLeadByPhone(phone: string): Lead | null {
  return all().find((l) => l.phone === phone) ?? null;
}

export function createLead(input: Omit<Lead, "id" | "status" | "lastError" | "contactedAt" | "createdAt">): Lead {
  const lead: Lead = {
    ...input,
    id: crypto.randomUUID(),
    status: "new",
    lastError: null,
    contactedAt: null,
    createdAt: new Date().toISOString(),
  };
  const leads = all();
  leads.push(lead);
  save(leads);
  return lead;
}

export function updateLead(id: string, patch: Partial<Lead>): void {
  const leads = all();
  save(leads.map((l) => (l.id === id ? { ...l, ...patch } : l)));
}

export function listNewLeads(limit: number): Lead[] {
  return all()
    .filter((l) => l.status === "new")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, limit);
}

/** Marks every lead sharing this phone number as opted-out so we never
 * message them again — triggered when they reply STOP/BERHENTI to an
 * outreach message. */
export function optOutByPhone(phone: string): number {
  const leads = all();
  let count = 0;
  const updated = leads.map((l) => {
    if (l.phone === phone && l.status !== "opted_out") {
      count++;
      return { ...l, status: "opted_out" as const };
    }
    return l;
  });
  if (count > 0) save(updated);
  return count;
}
