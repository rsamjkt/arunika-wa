"use client";

import { useEffect, useState } from "react";
import { MessagesSquare, Send, Package, Search, Sparkles } from "lucide-react";

interface IntegrationData {
  telegram: { configured: boolean; maskedToken: string | null; ownerId: string | null; hasSecret: boolean; webhookUrl: string };
  shipping: { configured: boolean; masked: string | null };
  webSearch: { configured: boolean; masked: string | null };
  tools: { name: string; description: string }[];
}

function StatusBadge({ on }: { on: boolean }) {
  return <span className={`badge ${on ? "good" : "off"}`}>{on ? "Aktif" : "Belum aktif"}</span>;
}

export default function IntegrasiPage() {
  const [data, setData] = useState<IntegrationData | null>(null);
  const [tgToken, setTgToken] = useState("");
  const [tgSecret, setTgSecret] = useState("");
  const [shipKey, setShipKey] = useState("");
  const [tavily, setTavily] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function load() {
    fetch("/api/admin/integrations")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});
  }
  useEffect(load, []);

  async function save(kind: string, payload: Record<string, string | undefined>, key: string, clear?: () => void) {
    setBusy(key);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ...payload }),
      });
      if (res.ok) {
        setMsg({ ok: true, text: "Tersimpan ✓" });
        clear?.();
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        setMsg({ ok: false, text: d.error ?? "Gagal menyimpan" });
      }
    } finally {
      setBusy(null);
    }
  }

  async function connectTelegram() {
    setBusy("tg-connect");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect-telegram" }),
      });
      const d = await res.json().catch(() => ({}));
      setMsg({ ok: res.ok, text: res.ok ? "Webhook Telegram terhubung ✓" : `Gagal: ${d.description ?? d.error ?? "-"}` });
      load();
    } finally {
      setBusy(null);
    }
  }

  if (!data) return <p style={{ color: "var(--ink-soft)" }}>Memuat…</p>;

  const iconChip = { width: 38, height: 38, borderRadius: 11, background: "var(--primary-soft)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as const;

  return (
    <div style={{ maxWidth: 780, display: "flex", flexDirection: "column", gap: 18 }}>
      <p className="sub" style={{ margin: 0 }}>
        Kelola channel & integrasi Arunika dari satu tempat — nyalakan sendiri tanpa utak-atik server.
      </p>

      {/* CHANNELS */}
      <section className="card" style={{ padding: 22 }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 4px" }}>Channel</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", margin: "0 0 16px" }}>Platform tempat Arunika membalas pesan.</p>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
          <span style={iconChip}><MessagesSquare size={19} strokeWidth={2} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: "0.92rem" }}>WhatsApp</strong> <StatusBadge on={true} />
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--ink-soft)", margin: "3px 0 0" }}>Channel utama — kelola perangkat & sesi di Dashboard.</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingTop: 16 }}>
          <span style={iconChip}><Send size={18} strokeWidth={2} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <strong style={{ fontSize: "0.92rem" }}>Telegram</strong> <StatusBadge on={data.telegram.configured} />
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--ink-soft)", margin: "0 0 10px" }}>
              Buat bot di <b>@BotFather</b> → salin token → tempel di sini → klik Hubungkan. Arunika akan menjawab di Telegram dengan otak yang sama (KB, agent, dll).
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 460 }}>
              <input className="field" placeholder={data.telegram.maskedToken ?? "Bot token (123456:ABC…)"} value={tgToken} onChange={(e) => setTgToken(e.target.value)} />
              <input className="field" placeholder={data.telegram.hasSecret ? "secret tersimpan (kosongkan bila tak diubah)" : "webhook secret (opsional, disarankan)"} value={tgSecret} onChange={(e) => setTgSecret(e.target.value)} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn" disabled={busy === "tg-save"} onClick={() => save("telegram", { botToken: tgToken || undefined, webhookSecret: tgSecret || undefined }, "tg-save", () => { setTgToken(""); setTgSecret(""); })}>
                  {busy === "tg-save" ? "Menyimpan…" : "Simpan"}
                </button>
                <button className="btn secondary" disabled={busy === "tg-connect" || !data.telegram.configured} onClick={connectTelegram}>
                  {busy === "tg-connect" ? "Menghubungkan…" : "Hubungkan webhook"}
                </button>
              </div>
              <small style={{ fontSize: "0.68rem", color: "var(--ink-soft)" }}>Webhook: {data.telegram.webhookUrl}</small>
            </div>
          </div>
        </div>
      </section>

      {/* API INTEGRATIONS */}
      <section className="card" style={{ padding: 22 }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 4px" }}>API Integrasi</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", margin: "0 0 16px" }}>Kunci layanan pihak ketiga yang dipakai Arunika sebagai tool/skill.</p>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
          <span style={iconChip}><Package size={18} strokeWidth={2} /></span>
          <div style={{ flex: 1, maxWidth: 460 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <strong style={{ fontSize: "0.92rem" }}>Kurir (Binderbyte)</strong> <StatusBadge on={data.shipping.configured} />
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--ink-soft)", margin: "0 0 10px" }}>Untuk tool <b>cek resi</b> & <b>hitung ongkir</b>. Ambil key gratis di binderbyte.com.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="field" placeholder={data.shipping.masked ?? "API key Binderbyte"} value={shipKey} onChange={(e) => setShipKey(e.target.value)} />
              <button className="btn" disabled={busy === "ship" || !shipKey.trim()} onClick={() => save("shipping", { apiKey: shipKey }, "ship", () => setShipKey(""))}>
                {busy === "ship" ? "…" : "Simpan"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingTop: 16 }}>
          <span style={iconChip}><Search size={18} strokeWidth={2} /></span>
          <div style={{ flex: 1, maxWidth: 460 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <strong style={{ fontSize: "0.92rem" }}>Web Search (Tavily)</strong> <StatusBadge on={data.webSearch.configured} />
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--ink-soft)", margin: "0 0 10px" }}>Arunika bisa cari info terkini dari web saat pesan butuh (berita/harga/dll).</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="field" placeholder={data.webSearch.masked ?? "API key Tavily (tvly-…)"} value={tavily} onChange={(e) => setTavily(e.target.value)} />
              <button className="btn" disabled={busy === "tavily" || !tavily.trim()} onClick={() => save("websearch", { apiKey: tavily }, "tavily", () => setTavily(""))}>
                {busy === "tavily" ? "…" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SKILLS / TOOLS */}
      <section className="card" style={{ padding: 22 }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 4px" }}>Kemampuan Arunika · {data.tools.length} tools</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", margin: "0 0 14px" }}>Skill yang bisa dipanggil Arunika saat Mode Agent aktif (atur di Auto-Reply).</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.tools.map((t) => (
            <div key={t.name} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "0.82rem" }}>
              <Sparkles size={15} strokeWidth={2} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 2 }} />
              <span>
                <code style={{ fontWeight: 700 }}>{t.name}</code>
                <span style={{ color: "var(--ink-soft)" }}> — {t.description.split(".")[0]}.</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {msg && (
        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: msg.ok ? "var(--success)" : "var(--danger)" }}>{msg.text}</p>
      )}
    </div>
  );
}
