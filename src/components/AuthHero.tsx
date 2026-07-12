const FEATURES = [
  { icon: "👥", text: "Staf/tim tak terbatas di setiap paket, termasuk yang gratis" },
  { icon: "💸", text: "Mulai dari Rp0 — paket berbayar dari Rp19.000/bulan" },
  { icon: "📅", text: "Broadcast terjadwal, template, dan auto-reply bawaan" },
  { icon: "🔌", text: "API key sendiri untuk integrasi ke aplikasi Anda" },
];

export default function AuthHero({
  title,
  lead,
}: {
  title: string;
  lead: string;
}) {
  return (
    <div className="auth-hero">
      <div className="auth-hero-inner">
        <div className="brand">
          <span className="mark">A</span>
          Arunika · WA
        </div>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
        <div className="auth-hero-features">
          {FEATURES.map((f) => (
            <div className="auth-hero-feature" key={f.text}>
              <span className="ic">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
