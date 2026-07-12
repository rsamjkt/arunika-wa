"use client";

import { useCallback, useEffect, useState } from "react";

interface StaffUser {
  id: string;
  username: string;
  email: string | null;
  createdAt: string;
}

export default function TeamSettingsPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team");
      if (res.ok) setStaff(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email: email.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat akun staf");
      setUsername("");
      setPassword("");
      setEmail("");
      setMessage({ ok: true, text: `Staf "${data.username}" berhasil ditambahkan.` });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal membuat akun staf" });
    } finally {
      setCreating(false);
    }
  }

  async function changePassword(s: StaffUser) {
    const newPassword = window.prompt(`Password baru untuk "${s.username}" (min. 6 karakter):`);
    if (!newPassword) return;
    setBusy(s.id + "pw");
    setMessage(null);
    try {
      const res = await fetch(`/api/team/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengubah password");
      setMessage({ ok: true, text: `Password "${s.username}" berhasil diubah.` });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal mengubah password" });
    } finally {
      setBusy(null);
    }
  }

  async function remove(s: StaffUser) {
    if (!confirm(`Hapus staf "${s.username}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(s.id + "del");
    setMessage(null);
    try {
      const res = await fetch(`/api/team/${s.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menghapus staf");
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menghapus staf" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="card" style={{ padding: 22, marginBottom: 18 }}>
        <h2 style={{ fontSize: "1rem", marginBottom: 4 }}>Tambah anggota tim</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginBottom: 16 }}>
          Staf memakai paket, kuota, dan perangkat WhatsApp yang sama dengan akun Anda — cocok untuk agent/CS yang
          login terpisah. Mereka tidak bisa mengubah paket atau mengelola tim.
        </p>
        <form
          onSubmit={createStaff}
          style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className="field-group" style={{ flex: "1 1 180px", marginBottom: 0 }}>
            <label htmlFor="staff-username">Username</label>
            <input
              id="staff-username"
              className="field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="field-group" style={{ flex: "1 1 180px", marginBottom: 0 }}>
            <label htmlFor="staff-password">Password</label>
            <input
              id="staff-password"
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="field-group" style={{ flex: "1 1 200px", marginBottom: 0 }}>
            <label htmlFor="staff-email">Email (opsional)</label>
            <input
              id="staff-email"
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              placeholder="untuk lupa password"
            />
          </div>
          <button
            className="btn"
            type="submit"
            disabled={creating || username.trim().length < 3 || password.length < 6}
          >
            {creating ? "Menyimpan…" : "Tambah Staf"}
          </button>
        </form>
        {message && (
          <p style={{ marginTop: 12, fontSize: "0.82rem", color: message.ok ? "var(--success)" : "var(--danger)" }}>
            {message.text}
          </p>
        )}
      </div>

      <div className="table-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Ditambahkan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="avatar-sm">{s.username.slice(0, 2).toUpperCase()}</div>
                    <strong>{s.username}</strong>
                  </div>
                </td>
                <td style={{ color: "var(--ink-soft)" }}>{s.email ?? "—"}</td>
                <td className="mono" style={{ color: "var(--ink-soft)" }}>
                  {new Date(s.createdAt).toLocaleString("id-ID")}
                </td>
                <td className="actions-cell">
                  <button className="btn secondary" disabled={busy === s.id + "pw"} onClick={() => changePassword(s)}>
                    Ubah Password
                  </button>
                  <button className="btn danger" disabled={busy === s.id + "del"} onClick={() => remove(s)}>
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {!loading && staff.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 24 }}>
                  Belum ada anggota tim.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
