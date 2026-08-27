import { CheckCheck, ShieldCheck, Users, Zap } from "lucide-react";

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
        <div className="auth-brand">
          <span className="m">A</span>
          Arunika · WA
        </div>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>

        {/* Mock percakapan — memperlihatkan produk (auto-reply Arunika) apa adanya */}
        <div className="auth-chat">
          <div className="au-bub in">
            Halo, toko masih buka? mau order yang kemarin 🙏
            <span className="m">19.42</span>
          </div>
          <div className="au-bub out">
            Halo kak! 😊 Masih buka sampai jam 21.00. Mau aku bantu catat pesanannya sekarang?
            <span className="m">
              19.42 <CheckCheck size={13} strokeWidth={2.5} />
            </span>
          </div>
          <span className="au-badge">
            <Zap size={12} strokeWidth={2.5} /> Dibalas otomatis oleh Arunika
          </span>
        </div>

        <div className="auth-trust">
          <div>
            <ShieldCheck size={17} strokeWidth={2} /> Data tiap akun terisolasi &amp; aman
          </div>
          <div>
            <Users size={17} strokeWidth={2} /> Staf tak terbatas di semua paket
          </div>
          <div>
            <Zap size={17} strokeWidth={2} /> Aktif dalam hitungan menit
          </div>
        </div>
      </div>
    </div>
  );
}
