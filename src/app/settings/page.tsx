import Link from "next/link";

export default function SettingsHubPage() {
  return (
    <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      <Link href="/settings/users" className="card" style={{ padding: 22, textDecoration: "none", color: "inherit" }}>
        <div style={{ fontSize: "1.6rem", marginBottom: 10 }}>🧑</div>
        <h2 style={{ fontSize: "1rem", marginBottom: 6 }}>Manajemen User</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
          Kelola akun yang bisa login ke dashboard ini — tambah, ubah password, atau hapus user.
        </p>
      </Link>
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
    </div>
  );
}
