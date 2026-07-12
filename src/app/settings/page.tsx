import Link from "next/link";
import { getCurrentFullUser } from "@/lib/currentUser";

export default async function SettingsHubPage() {
  const user = await getCurrentFullUser();
  const isSuperadmin = user?.role === "superadmin";
  const isTenantOwner = user?.role === "tenant";

  return (
    <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      {isSuperadmin && (
        <Link href="/settings/users" className="card" style={{ padding: 22, textDecoration: "none", color: "inherit" }}>
          <div style={{ fontSize: "1.6rem", marginBottom: 10 }}>🧑</div>
          <h2 style={{ fontSize: "1rem", marginBottom: 6 }}>Manajemen User</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
            Kelola akun staf platform yang bisa login ke dashboard ini — tambah, ubah password, atau hapus user.
          </p>
        </Link>
      )}
      {isTenantOwner && (
        <Link href="/settings/team" className="card" style={{ padding: 22, textDecoration: "none", color: "inherit" }}>
          <div style={{ fontSize: "1.6rem", marginBottom: 10 }}>👥</div>
          <h2 style={{ fontSize: "1rem", marginBottom: 6 }}>Kelola Tim</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
            Tambahkan staf/agent yang login terpisah tapi memakai paket, kuota, dan perangkat WA yang sama.
          </p>
        </Link>
      )}
      <Link
        href="/settings/api-keys"
        className="card"
        style={{ padding: 22, textDecoration: "none", color: "inherit" }}
      >
        <div style={{ fontSize: "1.6rem", marginBottom: 10 }}>🔑</div>
        <h2 style={{ fontSize: "1rem", marginBottom: 6 }}>API Key</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
          Buat dan kelola API key untuk aplikasi eksternal yang mengakses endpoint /api/* tanpa login browser.
        </p>
      </Link>
      <Link href="/settings/webhook" className="card" style={{ padding: 22, textDecoration: "none", color: "inherit" }}>
        <div style={{ fontSize: "1.6rem", marginBottom: 10 }}>🔔</div>
        <h2 style={{ fontSize: "1rem", marginBottom: 6 }}>Webhook</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
          Teruskan event WhatsApp (pesan masuk, status terkirim) ke sistem eksternal Anda secara real-time.
        </p>
      </Link>
    </div>
  );
}
