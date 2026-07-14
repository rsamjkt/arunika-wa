"use client";

import { useEffect, useState } from "react";

interface ProviderStatus {
  provider: string;
  label: string;
  configured: boolean;
  maskedHint: string | null;
}

export default function AIProvidersPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function load() {
    fetch("/api/admin/ai-providers")
      .then((r) => r.json())
      .then((data) => setProviders(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function save(provider: string) {
    const apiKey = (inputs[provider] ?? "").trim();
    if (!apiKey) return;
    setSaving(provider);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ai-providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan");
      setInputs((prev) => ({ ...prev, [provider]: "" }));
      setMessage({ ok: true, text: "API key disimpan." });
      load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menyimpan" });
    } finally {
      setSaving(null);
    }
  }

  async function remove(provider: string) {
    if (!confirm(`Hapus API key untuk provider ini? Model dari provider ini akan berhenti bisa dipakai tenant.`)) return;
    setSaving(provider);
    try {
      await fetch("/api/admin/ai-providers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      load();
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <p style={{ color: "var(--ink-soft)" }}>Memuat…</p>;
  }

  return (
    <div>
      <div className="card cpad" style={{ padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
          API key di sini dipakai untuk fitur Balasan AI di semua tenant (paket berbayar). Tempel API key dari provider
          mana pun yang Anda punya — tidak perlu semuanya, cukup salah satu untuk mengaktifkan fitur. Perubahan langsung
          aktif tanpa perlu restart server.
        </p>
      </div>

      {message && (
        <p style={{ fontSize: "0.82rem", color: message.ok ? "var(--success)" : "var(--danger)", marginBottom: 12 }}>
          {message.text}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {providers.map((p) => (
          <div key={p.provider} className="card cpad" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <strong style={{ fontSize: "0.92rem" }}>{p.label}</strong>
              {p.configured ? (
                <span className="badge good">Aktif · {p.maskedHint}</span>
              ) : (
                <span className="badge off">Belum diatur</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="field"
                type="password"
                placeholder={p.configured ? "Tempel API key baru untuk mengganti…" : "Tempel API key di sini…"}
                value={inputs[p.provider] ?? ""}
                onChange={(e) => setInputs((prev) => ({ ...prev, [p.provider]: e.target.value }))}
              />
              <button
                className="btn"
                style={{ flexShrink: 0 }}
                disabled={saving === p.provider || !(inputs[p.provider] ?? "").trim()}
                onClick={() => save(p.provider)}
              >
                {saving === p.provider ? "Menyimpan…" : "Simpan"}
              </button>
              {p.configured && (
                <button
                  className="btn danger"
                  style={{ flexShrink: 0 }}
                  disabled={saving === p.provider}
                  onClick={() => remove(p.provider)}
                >
                  Hapus
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
