"use client";

import { useCallback, useEffect, useState } from "react";

interface KeywordRule {
  id: string;
  keywords: string[];
  reply: string;
  enabled: boolean;
}
interface AutoReplySettings {
  enabled: boolean;
  welcomeEnabled: boolean;
  welcomeMessage: string;
  businessHours: { enabled: boolean; days: number[]; start: string; end: string };
  outsideHoursEnabled: boolean;
  outsideHoursMessage: string;
  rules: KeywordRule[];
}

interface AIModelOption {
  id: string;
  provider: string;
  label: string;
  description: string;
  configured: boolean;
}

interface AISettings {
  enabled: boolean;
  businessName: string;
  knowledgeBase: string;
  tone: string;
  model: string;
  configured: boolean;
  modelConfigured: boolean;
  availableModels: AIModelOption[];
}

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function FlowPage() {
  const [settings, setSettings] = useState<AutoReplySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [ruleKeywords, setRuleKeywords] = useState("");
  const [ruleReply, setRuleReply] = useState("");
  const [addingRule, setAddingRule] = useState(false);

  const [ai, setAi] = useState<AISettings | null>(null);
  const [aiSaving, setAiSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/autoreply");
      if (res.ok) setSettings(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAI = useCallback(async () => {
    const res = await fetch("/api/ai-autoreply");
    if (res.ok) setAi(await res.json());
  }, []);

  useEffect(() => {
    load();
    loadAI();
  }, [load, loadAI]);

  async function saveAI(patch: Partial<AISettings>, key: string) {
    if (!ai) return;
    const next = { ...ai, ...patch };
    setAi(next);
    setAiSaving(key);
    setMessage(null);
    try {
      const res = await fetch("/api/ai-autoreply", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      setMessage({ ok: true, text: "Perubahan disimpan." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menyimpan" });
    } finally {
      setAiSaving(null);
    }
  }

  async function saveSettings(patch: Partial<AutoReplySettings>, key: string) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(key);
    setMessage(null);
    try {
      const res = await fetch("/api/autoreply", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      setMessage({ ok: true, text: "Perubahan disimpan." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menyimpan" });
    } finally {
      setSaving(null);
    }
  }

  function toggleDay(day: number) {
    if (!settings) return;
    const days = settings.businessHours.days.includes(day)
      ? settings.businessHours.days.filter((d) => d !== day)
      : [...settings.businessHours.days, day].sort();
    saveSettings({ businessHours: { ...settings.businessHours, days } }, "hours");
  }

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    setAddingRule(true);
    setMessage(null);
    try {
      const keywords = ruleKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const res = await fetch("/api/autoreply/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, reply: ruleReply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menambah aturan");
      setRuleKeywords("");
      setRuleReply("");
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menambah aturan" });
    } finally {
      setAddingRule(false);
    }
  }

  async function toggleRule(rule: KeywordRule) {
    await fetch(`/api/autoreply/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    await load();
  }

  async function removeRule(rule: KeywordRule) {
    if (!confirm(`Hapus aturan untuk kata kunci "${rule.keywords.join(", ")}"?`)) return;
    await fetch(`/api/autoreply/rules/${rule.id}`, { method: "DELETE" });
    await load();
  }

  if (loading || !settings) {
    return <p style={{ color: "var(--ink-soft)" }}>Memuat…</p>;
  }

  return (
    <div className="grid2" style={{ gridTemplateColumns: "1.3fr 1fr", alignItems: "start", gap: 22 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {ai && (
          <div className="card cpad" style={{ padding: 20 }}>
            <div className="ch">
              <div>
                <h2 style={{ fontSize: "1rem" }}>
                  Balasan AI <span className="chip">Baru</span>
                </h2>
                <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: 4 }}>
                  Balas pesan pelanggan pakai AI berdasarkan info bisnis Anda sendiri — bukan cuma cocokkan kata kunci.
                  Dipakai kalau tidak ada aturan kata kunci di bawah yang cocok.
                </p>
              </div>
              <button
                className={`toggle${ai.enabled ? " on" : ""}`}
                style={{ marginLeft: "auto", flexShrink: 0 }}
                onClick={() => saveAI({ enabled: !ai.enabled }, "aiEnabled")}
                disabled={aiSaving === "aiEnabled" || !ai.modelConfigured}
                aria-label="Aktifkan balasan AI"
              />
            </div>
            {!ai.configured && (
              <p style={{ fontSize: "0.78rem", color: "var(--warning)", marginBottom: 12 }}>
                Fitur ini belum diaktifkan di server platform — hubungi admin.
              </p>
            )}
            {ai.configured && !ai.modelConfigured && (
              <p style={{ fontSize: "0.78rem", color: "var(--warning)", marginBottom: 12 }}>
                API key untuk model ini belum diatur di server. Pilih model lain yang sudah aktif, atau hubungi admin.
              </p>
            )}
            <label className="lbl">Nama bisnis Anda</label>
            <input
              className="field"
              style={{ marginBottom: 10 }}
              value={ai.businessName}
              onChange={(e) => setAi({ ...ai, businessName: e.target.value })}
              onBlur={() => saveAI({ businessName: ai.businessName }, "aiName")}
              placeholder="mis. Toko Kue Bahagia"
              disabled={!ai.configured}
            />
            <label className="lbl">Model AI</label>
            <select
              style={{ marginBottom: 4 }}
              value={ai.model}
              onChange={(e) => {
                const model = e.target.value;
                setAi({ ...ai, model });
                saveAI({ model }, "aiModel");
              }}
              disabled={!ai.configured}
            >
              {(ai.availableModels ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                  {!m.configured ? " (belum aktif)" : ""}
                </option>
              ))}
            </select>
            <p style={{ fontSize: "0.75rem", color: "var(--ink-soft)", marginBottom: 14 }}>
              {ai.availableModels?.find((m) => m.id === ai.model)?.description}
            </p>
            <label className="lbl">Info bisnis / FAQ (dipakai AI untuk jawab pelanggan)</label>
            <textarea
              className="compose"
              style={{ minHeight: 140 }}
              value={ai.knowledgeBase}
              onChange={(e) => setAi({ ...ai, knowledgeBase: e.target.value })}
              onBlur={() => saveAI({ knowledgeBase: ai.knowledgeBase }, "aiKb")}
              placeholder={"Contoh:\nJam buka: Senin-Sabtu 09.00-20.00\nProduk: kue ulang tahun custom mulai Rp150.000\nPengiriman: Gojek/Grab area Jakarta, ongkir ditanggung pembeli\nPembayaran: transfer BCA atau QRIS"}
              disabled={!ai.configured}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--ink-soft)", marginTop: 8 }}>
              AI hanya menjawab berdasarkan info di atas — kalau tidak tahu, dia bilang jujur akan menghubungkan ke
              tim, tidak mengarang jawaban.
            </p>
          </div>
        )}

        <div className="card cpad" style={{ padding: 20 }}>
          <div className="ch">
            <div>
              <h2 style={{ fontSize: "1rem" }}>Balasan Kata Kunci</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: 4 }}>
                Balas otomatis kalau pesan masuk mengandung salah satu kata kunci berikut.
              </p>
            </div>
          </div>
          <form onSubmit={addRule} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
            <label className="lbl">Kata kunci (pisahkan dengan koma)</label>
            <input
              className="field"
              style={{ marginBottom: 10 }}
              value={ruleKeywords}
              onChange={(e) => setRuleKeywords(e.target.value)}
              placeholder="halo, menu, info harga"
            />
            <label className="lbl">Balasan otomatis</label>
            <textarea
              className="compose"
              style={{ minHeight: 90 }}
              value={ruleReply}
              onChange={(e) => setRuleReply(e.target.value)}
              placeholder="Halo! Ketik *menu* untuk lihat katalog produk kami."
            />
            <button
              className="btn"
              type="submit"
              style={{ marginTop: 10 }}
              disabled={addingRule || !ruleKeywords.trim() || !ruleReply.trim()}
            >
              {addingRule ? "Menambah…" : "Tambah Aturan"}
            </button>
          </form>

          {settings.rules.map((rule) => (
            <div
              key={rule.id}
              className="fnrule"
              style={{ flexDirection: "column", alignItems: "stretch", gap: 8, marginTop: 8 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {rule.keywords.map((kw) => (
                  <span key={kw} className="kbd">
                    {kw}
                  </span>
                ))}
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button
                    className={`toggle${rule.enabled ? " on" : ""}`}
                    onClick={() => toggleRule(rule)}
                    aria-label="Aktifkan aturan"
                  />
                  <button className="btn secondary" style={{ padding: "4px 10px" }} onClick={() => removeRule(rule)}>
                    Hapus
                  </button>
                </div>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>{rule.reply}</p>
            </div>
          ))}
          {settings.rules.length === 0 && (
            <p style={{ color: "var(--ink-soft)", fontSize: "0.82rem" }}>Belum ada aturan kata kunci.</p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card cpad" style={{ padding: 20 }}>
          <div className="ch">
            <h2 style={{ fontSize: "1rem" }}>Pengaturan Cepat</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>Auto-reply aktif</div>
              <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>Nyalakan seluruh bot balasan otomatis</div>
            </div>
            <button
              className={`toggle${settings.enabled ? " on" : ""}`}
              onClick={() => saveSettings({ enabled: !settings.enabled }, "enabled")}
              disabled={saving === "enabled"}
              aria-label="Aktifkan auto-reply"
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>Pesan di luar jam kerja</div>
              <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>Kirim info jam operasional</div>
            </div>
            <button
              className={`toggle${settings.outsideHoursEnabled ? " on" : ""}`}
              onClick={() => saveSettings({ outsideHoursEnabled: !settings.outsideHoursEnabled }, "outside")}
              disabled={saving === "outside"}
              aria-label="Aktifkan pesan luar jam kerja"
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>Salam pertama (welcome)</div>
              <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>Untuk kontak yang baru pertama kali chat</div>
            </div>
            <button
              className={`toggle${settings.welcomeEnabled ? " on" : ""}`}
              onClick={() => saveSettings({ welcomeEnabled: !settings.welcomeEnabled }, "welcome")}
              disabled={saving === "welcome"}
              aria-label="Aktifkan pesan welcome"
            />
          </div>
        </div>

        <div className="card cpad" style={{ padding: 20 }}>
          <div className="ch">
            <h2 style={{ fontSize: "1rem" }}>Jam Operasional</h2>
            <button
              className={`toggle${settings.businessHours.enabled ? " on" : ""}`}
              style={{ marginLeft: "auto" }}
              onClick={() => saveSettings({ businessHours: { ...settings.businessHours, enabled: !settings.businessHours.enabled } }, "hours")}
              aria-label="Aktifkan jam operasional"
            />
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {DAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                type="button"
                className="chip"
                style={
                  settings.businessHours.days.includes(idx)
                    ? { background: "var(--success-bg)", color: "var(--success)", fontWeight: 700 }
                    : undefined
                }
                onClick={() => toggleDay(idx)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid2">
            <div>
              <label className="lbl">Mulai (WIB)</label>
              <input
                type="time"
                className="field"
                value={settings.businessHours.start}
                onChange={(e) => saveSettings({ businessHours: { ...settings.businessHours, start: e.target.value } }, "hours")}
              />
            </div>
            <div>
              <label className="lbl">Selesai (WIB)</label>
              <input
                type="time"
                className="field"
                value={settings.businessHours.end}
                onChange={(e) => saveSettings({ businessHours: { ...settings.businessHours, end: e.target.value } }, "hours")}
              />
            </div>
          </div>
        </div>

        <div className="card cpad" style={{ padding: 20 }}>
          <div className="ch">
            <h2 style={{ fontSize: "1rem" }}>Pesan Welcome</h2>
          </div>
          <textarea
            className="compose"
            style={{ minHeight: 90 }}
            value={settings.welcomeMessage}
            onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
          />
          <button
            className="btn"
            style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
            disabled={saving === "welcomeMsg"}
            onClick={() => saveSettings({ welcomeMessage: settings.welcomeMessage }, "welcomeMsg")}
          >
            Simpan Pesan Welcome
          </button>
        </div>

        <div className="card cpad" style={{ padding: 20 }}>
          <div className="ch">
            <h2 style={{ fontSize: "1rem" }}>Balasan di Luar Jam</h2>
          </div>
          <textarea
            className="compose"
            style={{ minHeight: 90 }}
            value={settings.outsideHoursMessage}
            onChange={(e) => setSettings({ ...settings, outsideHoursMessage: e.target.value })}
          />
          <button
            className="btn"
            style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
            disabled={saving === "outsideMsg"}
            onClick={() => saveSettings({ outsideHoursMessage: settings.outsideHoursMessage }, "outsideMsg")}
          >
            Simpan Balasan
          </button>
        </div>

        {message && (
          <p style={{ fontSize: "0.82rem", color: message.ok ? "var(--success)" : "var(--danger)" }}>{message.text}</p>
        )}
      </div>
    </div>
  );
}
