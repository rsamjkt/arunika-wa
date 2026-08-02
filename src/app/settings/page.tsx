import Link from "next/link";
import { ArrowRight, Bell, KeyRound, User, Users } from "lucide-react";
import { getCurrentFullUser } from "@/lib/currentUser";

export default async function SettingsHubPage() {
  const user = await getCurrentFullUser();
  const isSuperadmin = user?.role === "superadmin";
  const isTenantOwner = user?.role === "tenant";

  const items = [
    {
      show: isSuperadmin,
      href: "/settings/users",
      icon: <User size={18} />,
      title: "Manajemen User",
      desc: "Kelola akun staf platform yang bisa login ke dashboard ini — tambah, ubah password, atau hapus user.",
    },
    {
      show: isTenantOwner,
      href: "/settings/team",
      icon: <Users size={18} />,
      title: "Kelola Tim",
      desc: "Tambahkan staf/agent yang login terpisah tapi memakai paket, kuota, dan perangkat WA yang sama.",
    },
    {
      show: isTenantOwner || isSuperadmin,
      href: "/settings/api-keys",
      icon: <KeyRound size={18} />,
      title: "API Key",
      desc: "Buat dan kelola API key untuk aplikasi eksternal yang mengakses endpoint /api/* tanpa login browser.",
    },
    {
      show: isTenantOwner || isSuperadmin,
      href: "/settings/webhook",
      icon: <Bell size={18} />,
      title: "Webhook",
      desc: "Teruskan event WhatsApp (pesan masuk, status terkirim) ke sistem eksternal Anda secara real-time.",
    },
  ].filter((i) => i.show);

  return (
    <div className="split-shell">
      <div className="split-list">
        <div className="sl-head">
          <div className="sl-title">
            <h2>Pengaturan</h2>
          </div>
        </div>
        <div className="sl-items">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className="split-row" style={{ textDecoration: "none", alignItems: "flex-start", padding: "13px 14px" }}>
              <div className="settings-card-icon" style={{ margin: 0, width: 38, height: 38 }}>
                {i.icon}
              </div>
              <div className="sr-body">
                <div className="sr-title">{i.title}</div>
                <div className="sr-sub" style={{ whiteSpace: "normal", lineHeight: 1.35, marginTop: 3 }}>
                  {i.desc}
                </div>
              </div>
              <ArrowRight size={16} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      </div>

      <div className="split-detail">
        <div className="sd-empty">
          <div className="sd-emoji">⚙️</div>
          <div>
            <strong style={{ display: "block", color: "var(--ink)", marginBottom: 4 }}>Pengaturan</strong>
            Pilih salah satu menu di kiri untuk mengelola user, tim, API key, atau webhook.
          </div>
        </div>
      </div>
    </div>
  );
}
