// Anti-ban / keselamatan nomor untuk pengiriman massal. WAHA memakai WhatsApp
// jalur TIDAK resmi, sehingga rentan diblokir bila mengirim terlalu cepat,
// terlalu banyak, atau terus menembak nomor yang sudah menolak. Semua fungsi di
// sini MURNI (bisa diinjeksi RNG) agar mudah diuji; di-wire ke loop campaign
// (campaigns.ts).

const BASE_MIN_MS = 4_000;
const BASE_MAX_MS = 12_000;
// Sesekali "micro-break" lebih panjang supaya kecepatan kirim tak terlalu rata
// seperti mesin — pola manusiawi lebih kecil risikonya dibanding interval tetap.
const MICRO_BREAK_EVERY = 20;
const MICRO_BREAK_MIN_MS = 45_000;
const MICRO_BREAK_MAX_MS = 90_000;

// Warm-up: nomor baru mengirim sedikit dulu lalu naik bertahap tiap hari sampai
// batas harian aman — periode paling rawan blokir adalah minggu-minggu awal.
const WARMUP_SCHEDULE = [50, 100, 200, 350, 500, 750, 1000]; // cap hari ke-0..6
const WARMUP_MAX = 2_000;

// Back-off keselamatan: beberapa pengiriman GAGAL berturut-turut adalah sinyal
// kuat nomor diblokir/terputus. Terus mengirim ke "tembok" hanya mempercepat
// ban — lebih baik dihentikan agar bisa diperiksa manusia.
const MAX_CONSECUTIVE_FAILURES = 5;

function randInt(min: number, max: number, rnd: () => number): number {
  return Math.round(min + rnd() * (max - min));
}

/** Jeda (ms) sebelum mengirim pesan berikutnya, setelah `sentCount` terkirim.
 * `rnd` bisa diinjeksi untuk pengujian deterministik. */
export function humanDelayMs(sentCount: number, rnd: () => number = Math.random): number {
  if (sentCount > 0 && sentCount % MICRO_BREAK_EVERY === 0) {
    return randInt(MICRO_BREAK_MIN_MS, MICRO_BREAK_MAX_MS, rnd);
  }
  return randInt(BASE_MIN_MS, BASE_MAX_MS, rnd);
}

/** Batas kirim harian yang disarankan untuk sebuah nomor berumur `accountAgeDays`. */
export function warmupDailyCap(accountAgeDays: number): number {
  const age = Number.isFinite(accountAgeDays) && accountAgeDays > 0 ? Math.floor(accountAgeDays) : 0;
  return age >= WARMUP_SCHEDULE.length ? WARMUP_MAX : WARMUP_SCHEDULE[age];
}

/** True bila campaign harus dihentikan karena terlalu banyak gagal beruntun. */
export function shouldAbortForFailures(consecutiveFailures: number): boolean {
  return consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;
}

export const PACING = {
  BASE_MIN_MS,
  BASE_MAX_MS,
  MICRO_BREAK_EVERY,
  MICRO_BREAK_MIN_MS,
  WARMUP_MAX,
  MAX_CONSECUTIVE_FAILURES,
} as const;
