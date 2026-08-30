// Pub/sub in-memory untuk push realtime (SSE). Single-process `next start`,
// jadi memori proses cukup (pola sama seperti debounce di webhook & campaigns).
// Kunci = ownerId (tenant); tiap browser inbox men-subscribe untuk owner-nya.
type Client = (data: string) => void;

const subscribers = new Map<string, Set<Client>>();

export function subscribe(ownerId: string, client: Client): () => void {
  let set = subscribers.get(ownerId);
  if (!set) {
    set = new Set();
    subscribers.set(ownerId, set);
  }
  set.add(client);
  return () => {
    const s = subscribers.get(ownerId);
    if (!s) return;
    s.delete(client);
    if (s.size === 0) subscribers.delete(ownerId);
  };
}

/** Kirim event ke semua klien milik owner ini (best-effort). */
export function publish(ownerId: string, event: Record<string, unknown>): void {
  const set = subscribers.get(ownerId);
  if (!set || set.size === 0) return;
  const data = JSON.stringify(event);
  for (const client of set) {
    try {
      client(data);
    } catch {
      /* klien tutup — abaikan */
    }
  }
}
