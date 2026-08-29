import crypto from "node:crypto";
import { readJson, writeJson } from "./store";

// Janji/booking yang dibuat Arunika (skill buat_janji) atas permintaan pelanggan.
// Disimpan per-tenant agar bisa dilihat/ditindaklanjuti agen.
export type Appointment = {
  id: string;
  session: string;
  chatId: string;
  when: string;
  keperluan: string;
  nama?: string;
  createdAt: string;
};

const FILE = "appointments.json";
type Store = Record<string, Appointment[]>;

export function addAppointment(ownerId: string, appt: Omit<Appointment, "id" | "createdAt">): Appointment {
  const store = readJson<Store>(FILE, {});
  const full: Appointment = { ...appt, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  store[ownerId] = [full, ...(store[ownerId] ?? [])].slice(0, 500);
  writeJson(FILE, store);
  return full;
}

export function listAppointments(ownerId: string): Appointment[] {
  return readJson<Store>(FILE, {})[ownerId] ?? [];
}

/** Cascade delete saat akun tenant dihapus. */
export function deleteAllForOwner(ownerId: string): void {
  const store = readJson<Store>(FILE, {});
  delete store[ownerId];
  writeJson(FILE, store);
}
