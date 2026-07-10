"use client";

import { useCallback, useEffect, useState } from "react";

interface AppUser {
  id: string;
  username: string;
  createdAt: string;
}

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat user");
      setUsername("");
      setPassword("");
      setMessage({ ok: true, text: `User "${data.username}" berhasil dibuat.` });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal membuat user" });
    } finally {
      setCreating(false);
    }
  }

  async function changePassword(user: AppUser) {
    const newPassword = window.prompt(`Password baru untuk "${user.username}" (min. 6 karakter):`);
    if (!newPassword) return;
    setBusy(user.id + "pw");
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengubah password");
      setMessage({ ok: true, text: `Password "${user.username}" berhasil diubah.` });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal mengubah password" });
    } finally {
      setBusy(null);
    }
  }

  async function remove(user: AppUser) {
    if (!confirm(`Hapus user "${user.username}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(user.id + "del");
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menghapus user");
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menghapus user" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="card" style={{ padding: 22, marginBottom: 18 }}>
        <h2 style={{ fontSize: "1rem", marginBottom: 4 }}>Tambah user baru</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginBottom: 16 }}>
          Setiap user punya akses penuh ke dashboard ini setelah login.
        </p>
        <form onSubmit={createUser} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field-group" style={{ flex: "1 1 200px", marginBottom: 0 }}>
            <label htmlFor="new-username">Username</label>
            <input
              id="new-username"
              className="field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="field-group" style={{ flex: "1 1 200px", marginBottom: 0 }}>
            <label htmlFor="new-password">Password</label>
            <input
              id="new-password"
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button
            className="btn"
            type="submit"
            disabled={creating || username.trim().length < 3 || password.length < 6}
          >
            {creating ? "Menyimpan…" : "Tambah User"}
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
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="avatar-sm">{u.username.slice(0, 2).toUpperCase()}</div>
                    <strong>{u.username}</strong>
                  </div>
                </td>
                <td className="mono" style={{ color: "var(--ink-soft)" }}>
                  {new Date(u.createdAt).toLocaleString("id-ID")}
                </td>
                <td className="actions-cell">
                  <button
                    className="btn secondary"
                    disabled={busy === u.id + "pw"}
                    onClick={() => changePassword(u)}
                  >
                    Ubah Password
                  </button>
                  <button
                    className="btn danger"
                    disabled={busy === u.id + "del" || users.length <= 1}
                    onClick={() => remove(u)}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 24 }}>
                  Belum ada user.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
