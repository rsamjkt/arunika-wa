// Deteksi niat pelanggan untuk BICARA DENGAN MANUSIA / komplain serius, agar
// auto-reply bot berhenti dan chat dialihkan ke agen (smart escalation). Murni
// heuristik kata kunci (tanpa call LLM) supaya cepat, gratis, & mudah diuji.

const HANDOFF_PATTERNS: RegExp[] = [
  // minta manusia / CS / admin secara eksplisit
  /\b(bicara|ngobrol|chat|tanya|hubung\w*)\b.{0,15}\b(manusia|orang|cs|admin|agen|customer service|kakak(?:nya)?)\b/i,
  /\b(mau|minta|butuh)\b.{0,12}\b(cs|admin|manusia|agen|customer service)\b/i,
  /\b(sambung\w*|alih\w*|teruskan)\b.{0,12}\b(cs|admin|manusia|agen|tim)\b/i,
  /\b(ini\s+)?(bot|robot|mesin)\b.{0,10}\b(ya|kah|kan)?\b.{0,10}\b(bukan|jangan|males|gak mau)\b/i,
  /\b(jangan|gak mau|males)\b.{0,10}\b(bot|robot|dijawab bot)\b/i,
  /\bmanusia (aja|saja|dong|ya)\b/i,
  // komplain / eskalasi
  /\b(komplain|keluhan|kecewa|marah|refund|uang.{0,5}kembali|dana.{0,5}kembali|lapor(kan)?|tuntut|penipuan|ditipu|scam)\b/i,
];

export function needsHumanHandoff(text: string): boolean {
  const t = (text || "").trim();
  if (t.length < 2) return false;
  return HANDOFF_PATTERNS.some((re) => re.test(t));
}
