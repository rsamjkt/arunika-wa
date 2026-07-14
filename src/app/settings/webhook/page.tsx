"use client";

import { useCallback, useEffect, useState } from "react";

interface WebhookDelivery {
  id: string;
  timestamp: string;
  event: string;
  ok: boolean;
  status?: number;
  error?: string;
}

interface WebhookConfig {
  url: string;
  events: string[];
  enabled: boolean;
  secret: string;
  lastDeliveryAt: string | null;
  lastDeliveryOk: boolean | null;
  recentDeliveries: WebhookDelivery[];
}

const ALL_EVENTS = [
  { key: "message", label: "Pesan masuk" },
  { key: "message.ack", label: "Status terkirim/dibaca" },
  { key: "session.status", label: "Status perangkat berubah" },
];

export default function WebhookSettingsPage() {
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/webhook-config");
      if (res.ok) setConfig(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleEvent(key: string) {
    if (!config) return;
    const events = config.events.includes(key)
      ? config.events.filter((e) => e !== key)
      : [...config.events, key];
    setConfig({ ...config, events });
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/webhook-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: config.url, events: config.events, enabled: config.enabled }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      setMessage({ ok: true, text: "Konfigurasi webhook disimpan." });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menyimpan" });
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/webhook-config/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengirim test webhook");
      setMessage({ ok: true, text: "Test webhook berhasil dikirim." });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal mengirim test webhook" });
    } finally {
      setTesting(false);
    }
  }

  async function regenerateSecret() {
    if (!confirm("Buat ulang secret webhook? Endpoint penerima Anda perlu diperbarui untuk memverifikasi signature baru.")) return;
    setRegenerating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/webhook-config", { method: "POST" });
      if (!res.ok) throw new Error("Gagal membuat ulang secret");
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal membuat ulang secret" });
    } finally {
      setRegenerating(false);
    }
  }

  function copySecret() {
    if (!config) return;
    navigator.clipboard.writeText(config.secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (loading || !config) {
    return <p style={{ color: "var(--ink-soft)" }}>Memuat…</p>;
  }

  return (
    <div>
      <div className="card cpad mb16" style={{ padding: 22 }}>
        <div className="ch">
          <div>
            <h2 style={{ fontSize: "1rem" }}>Webhook Keluar</h2>
            <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: 4 }}>
              Teruskan event WhatsApp (pesan masuk, status terkirim, dll) ke sistem eksternal Anda secara real-time.
            </p>
          </div>
          <button
            className={`toggle${config.enabled ? " on" : ""}`}
            style={{ marginLeft: "auto" }}
            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
            aria-label={config.enabled ? "Nonaktifkan webhook" : "Aktifkan webhook"}
          />
        </div>

        <label className="lbl">Endpoint URL</label>
        <input
          className="field mono"
          style={{ marginBottom: 14, fontSize: "0.8rem" }}
          value={config.url}
          onChange={(e) => setConfig({ ...config, url: e.target.value })}
          placeholder="https://api.tokosaya.id/webhook/wa"
        />

        <label className="lbl">Event yang dikirim</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {ALL_EVENTS.map((ev) => (
            <button
              key={ev.key}
              type="button"
              className="chip"
              style={
                config.events.includes(ev.key)
                  ? { background: "var(--success-bg)", color: "var(--success)", fontWeight: 700 }
                  : undefined
              }
              onClick={() => toggleEvent(ev.key)}
            >
              {config.events.includes(ev.key) ? "✓ " : ""}
              {ev.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <button className="btn" disabled={saving} onClick={save}>
            {saving ? "Menyimpan…" : "Simpan Perubahan"}
          </button>
          <button className="btn secondary" disabled={testing || !config.url} onClick={sendTest}>
            {testing ? "Mengirim…" : "Kirim Tes Webhook"}
          </button>
        </div>
        {message && (
          <p style={{ marginTop: 12, fontSize: "0.82rem", color: message.ok ? "var(--success)" : "var(--danger)" }}>
            {message.text}
          </p>
        )}
        {config.lastDeliveryAt && (
          <p style={{ marginTop: 8, fontSize: "0.76rem", color: "var(--ink-soft)" }}>
            Pengiriman terakhir: {new Date(config.lastDeliveryAt).toLocaleString("id-ID")} —{" "}
            <span style={{ color: config.lastDeliveryOk ? "var(--success)" : "var(--danger)" }}>
              {config.lastDeliveryOk ? "berhasil" : "gagal"}
            </span>
          </p>
        )}
      </div>

      <div className="card cpad" style={{ padding: 22 }}>
        <div className="ch">
          <h2 style={{ fontSize: "1rem" }}>Signing Secret</h2>
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginBottom: 12 }}>
          Setiap request dikirim dengan header <code className="mono">X-Webhook-Hmac</code> — HMAC-SHA256 dari body
          request memakai secret ini. Verifikasi di endpoint Anda untuk memastikan request benar-benar dari
          Arunika-WA.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <code
            className="mono"
            style={{
              fontSize: "0.78rem",
              background: "var(--bg)",
              padding: "8px 12px",
              borderRadius: 8,
              boxShadow: "inset 0 0 0 1px var(--border)",
              flex: 1,
              overflowX: "auto",
            }}
          >
            {config.secret}
          </code>
          <button className="btn secondary" onClick={copySecret}>
            {copied ? "Tersalin!" : "Salin"}
          </button>
          <button className="btn secondary" disabled={regenerating} onClick={regenerateSecret}>
            {regenerating ? "Membuat…" : "Buat Ulang"}
          </button>
        </div>
      </div>

      <div className="card cpad" style={{ padding: 22, marginTop: 16 }}>
        <div className="ch">
          <div>
            <h2 style={{ fontSize: "1rem" }}>Riwayat Pengiriman</h2>
            <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: 4 }}>
              20 pengiriman terakhir ke endpoint Anda.
            </p>
          </div>
        </div>
        <table className="dtable">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Event</th>
              <th>Status</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {config.recentDeliveries.map((d) => (
              <tr key={d.id}>
                <td className="mono" style={{ color: "var(--ink-soft)" }}>
                  {new Date(d.timestamp).toLocaleString("id-ID")}
                </td>
                <td className="mono">{d.event}</td>
                <td>
                  <span className={`badge ${d.ok ? "good" : "bad"}`}>{d.ok ? "Berhasil" : "Gagal"}</span>
                </td>
                <td style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
                  {d.status ? `HTTP ${d.status}` : d.error ?? "—"}
                </td>
              </tr>
            ))}
            {config.recentDeliveries.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 24 }}>
                  Belum ada pengiriman.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
