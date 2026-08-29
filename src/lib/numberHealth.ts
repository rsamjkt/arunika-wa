// Kesehatan & warmup nomor WhatsApp (anti-ban). Umur nomor diperkirakan dari
// entri log paling awal, jadi nomor lama tidak dianggap "baru". Skor kesehatan
// menilai sinyal risiko ban: rasio gagal kirim tinggi & blast tanpa balasan.
import { getSessionCounts, getSessionFirstSeen, getSessionSentToday } from "./messageLog";
import { warmupDailyCap } from "./sendPacing";

export function sessionAgeDays(session: string): number {
  const first = getSessionFirstSeen(session);
  if (!first) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(first).getTime()) / 86_400_000));
}

export function warmupCapForSession(session: string): number {
  return warmupDailyCap(sessionAgeDays(session));
}

export type WarmupStatus = { ageDays: number; cap: number; sentToday: number; remaining: number };

export function warmupStatus(session: string): WarmupStatus {
  const cap = warmupCapForSession(session);
  const sentToday = getSessionSentToday(session);
  return { ageDays: sessionAgeDays(session), cap, sentToday, remaining: Math.max(0, cap - sentToday) };
}

export type HealthLabel = "baik" | "waspada" | "berisiko";
export type SessionHealth = {
  score: number;
  label: HealthLabel;
  sent: number;
  failed: number;
  received: number;
  failRate: number;
  replyRatio: number;
};

/** Skor 0..100 dari statistik N hari terakhir. Murni & deterministik (diuji). */
export function computeHealth(sent: number, failed: number, received: number): SessionHealth {
  const attempts = sent + failed;
  const failRate = attempts ? failed / attempts : 0;
  const replyRatio = sent ? received / sent : 1;

  let score = 100;
  // Gagal kirim beruntun/tinggi = sinyal kuat nomor bermasalah/diblokir.
  score -= Math.round(failRate * 70);
  // Blast volume tinggi tapi nyaris tak ada balasan = pola spam (berisiko ban).
  if (sent >= 50 && replyRatio < 0.05) score -= 30;
  else if (sent >= 20 && replyRatio < 0.1) score -= 15;
  score = Math.max(0, Math.min(100, score));

  const label: HealthLabel = score >= 70 ? "baik" : score >= 40 ? "waspada" : "berisiko";
  return { score, label, sent, failed, received, failRate, replyRatio };
}

export function sessionHealth(session: string, days = 7): SessionHealth {
  const { sent, failed, received } = getSessionCounts(session, days);
  return computeHealth(sent, failed, received);
}
