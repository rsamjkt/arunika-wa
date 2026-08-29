// Evaluator aritmetika AMAN untuk skill kalkulator. Whitelist ketat: hanya
// angka & operator ( + - * / ( ) . dan spasi ) — tak ada identifier/kata, jadi
// tak mungkin mengeksekusi kode. Deterministik & mudah diuji.
export function safeCalc(expr: string): number | null {
  const clean = (expr || "").trim();
  if (!clean || clean.length > 120) return null;
  if (!/^[0-9+\-*/(). ]+$/.test(clean)) return null;
  try {
    const val = Function(`"use strict"; return (${clean});`)() as unknown;
    return typeof val === "number" && Number.isFinite(val) ? val : null;
  } catch {
    return null;
  }
}
