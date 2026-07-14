"use client";

import { useEffect, useState } from "react";

interface ProviderStatus {
  provider: string;
  label: string;
  configured: boolean;
  maskedHint: string | null;
  baseUrl: string;
  defaultBaseUrl: string;
}

export default function AIProvidersPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function load() {
    fetch("/api/admin/ai-providers")
      .then((r) => r.json())
      .then((data: ProviderStatus[]) => {
        setProviders(Array.isArray(data) ? data : []);
        setUrlInputs((prev) => {
          const next = { ...prev };
          for (const p of data) {
            if (next[p.provider] === undefined) next[p.provider] = p.baseUrl;
          }
          return next;
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function save(provider: string, defaultBaseUrl: string) {
    const apiKey = (keyInputs[provider] ?? "").trim();
    const baseUrl = (urlInputs[provider] ?? "").trim();
    const urlChanged = baseUrl && baseUrl !== defaultBaseUrl;
    if (!apiKey && !urlChanged) return;

    setSaving(provider);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ai-providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: apiKey || undefined, baseUrl: baseUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan");
      setKeyInputs((prev) => ({ ...prev, [provider]: "" }));
      setMessage({ ok: true, text: "Disimpan." });
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
          mana pun yang Anda punya — tidak perlu semuanya, cukup salah satu untuk mengaktifkan fitur. Base URL sudah
          diisi otomatis sesuai default tiap provider — biasanya tidak perlu diubah, kecuali untuk kebutuhan khusus
          (mis. Qwen region China vs internasional, atau proxy/self-hosted). Perubahan langsung aktif tanpa perlu
          restart server.
        </p>
      </div>

      {message && (
        <p style={{ fontSize: "0.82rem", color: message.ok ? "var(--success)" : "var(--danger)", marginBottom: 12 }}>
          {message.text}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {providers.map((p) => {
          const urlChanged = (urlInputs[p.provider] ?? "").trim() !== p.defaultBaseUrl;
          return (
            <div key={p.provider} className="card cpad" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <strong style={{ fontSize: "0.92rem" }}>{p.label}</strong>
                {p.configured ? (
                  <span className="badge good">Aktif · {p.maskedHint}</span>
                ) : (
                  <span className="badge off">Belum diatur</span>
                )}
              </div>

              <label className="lbl">API Key</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  className="field"
                  type="password"
                  placeholder={p.configured ? "Tempel API key baru untuk mengganti…" : "Tempel API key di sini…"}
                  value={keyInputs[p.provider] ?? ""}
                  onChange={(e) => setKeyInputs((prev) => ({ ...prev, [p.provider]: e.target.value }))}
                />
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

              <label className="lbl">
                Base URL {urlChanged && <span style={{ color: "var(--warning)", fontWeight: 400 }}>(diubah dari default)</span>}
              </label>
              <input
                className="field mono"
                style={{ marginBottom: 10, fontSize: "0.8rem" }}
                value={urlInputs[p.provider] ?? ""}
                onChange={(e) => setUrlInputs((prev) => ({ ...prev, [p.provider]: e.target.value }))}
                placeholder={p.defaultBaseUrl}
              />

              <button
                className="btn"
                style={{ width: "100%", justifyContent: "center" }}
                disabled={
                  saving === p.provider ||
                  (!(keyInputs[p.provider] ?? "").trim() && !urlChanged)
                }
                onClick={() => save(p.provider, p.defaultBaseUrl)}
              >
                {saving === p.provider ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
