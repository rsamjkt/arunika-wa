// Spintax: mengubah pola {a|b|c} menjadi salah satu varian secara acak.
// Dipakai untuk memvariasikan teks broadcast per-penerima agar WhatsApp tak
// mudah menandai pengiriman massal yang identik (sinyal spam → risiko ban).
// Mendukung nesting: {Halo|Hai} {kak|kakak}. RNG bisa diinjeksi untuk pengujian.

const INNER_GROUP = /\{([^{}]*)\}/;

/** Kembalikan `input` dengan tiap grup {a|b|c} diganti satu opsi acak. */
export function applySpintax(input: string, rnd: () => number = Math.random): string {
  let out = input;
  let guard = 0;
  // Selalu selesaikan grup terdalam dulu (regex tanpa {} di dalamnya), ulangi
  // sampai tak ada grup tersisa — menangani nesting dengan aman.
  while (INNER_GROUP.test(out) && guard++ < 200) {
    out = out.replace(INNER_GROUP, (_m, body: string) => {
      const opts = body.split("|");
      return opts[Math.floor(rnd() * opts.length)] ?? "";
    });
  }
  return out;
}

/** True bila teks mengandung minimal satu grup pilihan {a|b}. */
export function hasSpintax(input: string): boolean {
  return /\{[^{}]*\|[^{}]*\}/.test(input);
}

/** Perkiraan jumlah kombinasi unik (untuk info UI). Dibatasi agar tak overflow. */
export function spintaxVariants(input: string): number {
  let total = 1;
  const re = /\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    const n = m[1].split("|").length;
    total = Math.min(total * n, 1_000_000);
  }
  return total;
}
