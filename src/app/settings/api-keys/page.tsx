"use client";

import { useCallback, useEffect, useState } from "react";

interface ApiKeyRecord {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
  sentCount: number;
  failedCount: number;
}

export default function ApiKeysSettingsPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/api-keys");
      if (res.ok) setKeys(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat API key");
      setName("");
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal membuat API key" });
    } finally {
      setCreating(false);
    }
  }

  async function revoke(k: ApiKeyRecord) {
    if (!confirm(`Nonaktifkan API key "${k.name}"? Semua request yang memakai key ini akan ditolak.`)) return;
    setBusy(k.id + "revoke");
    setMessage(null);
    try {
      const res = await fetch(`/api/api-keys/${k.id}`, { method: "PATCH" });
      if (!res.ok) throw new Error("Gagal menonaktifkan API key");
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menonaktifkan API key" });
    } finally {
      setBusy(null);
    }
  }

  async function remove(k: ApiKeyRecord) {
    if (!confirm(`Hapus permanen API key "${k.name}"?`)) return;
    setBusy(k.id + "del");
    setMessage(null);
    try {
      const res = await fetch(`/api/api-keys/${k.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus API key");
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menghapus API key" });
    } finally {
      setBusy(null);
    }
  }

  function copy(k: ApiKeyRecord) {
    navigator.clipboard.writeText(k.key).then(() => {
      setCopiedId(k.id);
      setTimeout(() => setCopiedId((cur) => (cur === k.id ? null : cur)), 1500);
    });
  }

  return (
    <div>
      <div className="card" style={{ padding: 22, marginBottom: 18 }}>
        <h2 style={{ fontSize: "1rem", marginBottom: 4 }}>Buat API key baru</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginBottom: 16 }}>
          Gunakan API key untuk mengakses <code className="mono">/api/*</code> dari aplikasi eksternal, dengan
          menyertakan header <code className="mono">X-Api-Key</code>. Lihat halaman{" "}
          <a href="/docs" style={{ color: "var(--primary)" }}>
            Dokumentasi API
          </a>{" "}
          untuk contoh lengkap.
        </p>
        <form onSubmit={createKey} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field-group" style={{ flex: "1 1 260px", marginBottom: 0 }}>
            <label htmlFor="key-name">Nama key (misal: "Aplikasi CRM")</label>
            <input
              id="key-name"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </div>
          <button className="btn" type="submit" disabled={creating || !name.trim()}>
            {creating ? "Membuat…" : "Generate API Key"}
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
              <th>Nama</th>
              <th>API Key</th>
              <th>Status</th>
              <th>Pesan Terkirim</th>
              <th>Terakhir dipakai</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td>
                  <strong>{k.name}</strong>
                  <div className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>
                    dibuat {new Date(k.createdAt).toLocaleDateString("id-ID")}
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <code
                      className="mono"
                      style={{
                        fontSize: "0.76rem",
                        background: "var(--bg)",
                        padding: "4px 8px",
                        borderRadius: 6,
                        boxShadow: "inset 0 0 0 1px var(--border)",
                      }}
                    >
                      {k.key}
                    </code>
                    <button className="btn secondary" style={{ padding: "4px 10px" }} onClick={() => copy(k)}>
                      {copiedId === k.id ? "Tersalin!" : "Salin"}
                    </button>
                  </div>
                </td>
                <td>
                  <span className={`badge ${k.revoked ? "bad" : "good"}`}>
                    {k.revoked ? "Nonaktif" : "Aktif"}
                  </span>
                </td>
                <td className="mono">
                  {k.sentCount}
                  {k.failedCount > 0 && (
                    <span style={{ color: "var(--danger)" }}> ({k.failedCount} gagal)</span>
                  )}
                </td>
                <td className="mono" style={{ color: "var(--ink-soft)" }}>
                  {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("id-ID") : "Belum pernah"}
                </td>
                <td className="actions-cell">
                  {!k.revoked && (
                    <button className="btn secondary" disabled={busy === k.id + "revoke"} onClick={() => revoke(k)}>
                      Nonaktifkan
                    </button>
                  )}
                  <button className="btn danger" disabled={busy === k.id + "del"} onClick={() => remove(k)}>
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {!loading && keys.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 24 }}>
                  Belum ada API key.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
