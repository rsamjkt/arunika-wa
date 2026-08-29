"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Key, Zap, Clock, Hand, Moon, ChevronLeft } from "lucide-react";

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
  const [section, setSection] = useState<string | null>(null);

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

  const sections: { key: string; emoji: React.ReactNode; title: string; sub: string; show?: boolean }[] = [
    { key: "ai", emoji: <Bot size={18} strokeWidth={2} />, title: "Balasan AI", sub: "Jawab pakai AI dari info bisnismu", show: !!ai },
    { key: "rules", emoji: <Key size={18} strokeWidth={2} />, title: "Balasan Kata Kunci", sub: `${settings.rules.length} aturan` },
    { key: "quick", emoji: <Zap size={18} strokeWidth={2} />, title: "Pengaturan Cepat", sub: "Nyalakan/matikan bot" },
    { key: "hours", emoji: <Clock size={18} strokeWidth={2} />, title: "Jam Operasional", sub: "Atur hari & jam kerja" },
    { key: "welcome", emoji: <Hand size={18} strokeWidth={2} />, title: "Pesan Welcome", sub: "Salam pertama untuk kontak baru" },
    { key: "outside", emoji: <Moon size={18} strokeWidth={2} />, title: "Balasan di Luar Jam", sub: "Auto-info saat tutup" },
  ].filter((s) => s.show !== false);

  const aiSection = ai && (
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
                style={{ marginLeft: "auto", flexShrink: 0, alignSelf: "flex-start" }}
                onClick={() => saveAI({ enabled: !ai.enabled }, "aiEnabled")}
                disabled={aiSaving === "aiEnabled" || !ai.modelConfigured}
                aria-label="Aktifkan balasan AI"
              />
            </div>
            {!ai.configured && (
              <div className="callout warn" style={{ marginBottom: 14 }}>
                Fitur ini belum diaktifkan di server platform — hubungi admin.
              </div>
            )}
            {ai.configured && !ai.modelConfigured && (
              <div className="callout warn" style={{ marginBottom: 14 }}>
                API key untuk model ini belum diatur di server. Pilih model lain yang sudah aktif, atau hubungi admin.
              </div>
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
              className="field"
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
              placeholder={"Tulis per topik, pisahkan tiap topik dengan BARIS KOSONG:\n\nJam buka: Senin-Sabtu 09.00-20.00, Minggu tutup.\n\nProduk: kue ulang tahun custom mulai Rp150.000. Pesan minimal H-2.\n\nPengiriman: Gojek/Grab area Jakarta, ongkir ditanggung pembeli.\n\nPembayaran: transfer BCA atau QRIS."}
              disabled={!ai.configured}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--ink-soft)", marginTop: 8 }}>
              Boleh panjang — Arunika otomatis mengambil <strong>bagian yang paling relevan</strong> dengan pertanyaan
              pelanggan (hemat & fokus). Tips: pisahkan tiap topik dengan baris kosong. Kalau info tak ada, dia jujur
              akan menghubungkan ke tim, tidak mengarang.
            </p>
          </div>
  );

  const rulesSection = (
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
  );

  const quickSection = (
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
  );

  const hoursSection = (
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
  );

  const welcomeSection = (
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
  );

  const outsideSection = (
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
  );

  const sectionContent: Record<string, React.ReactNode> = {
    ai: aiSection,
    rules: rulesSection,
    quick: quickSection,
    hours: hoursSection,
    welcome: welcomeSection,
    outside: outsideSection,
  };
  const current = section ? sections.find((s) => s.key === section) : null;

  return (
    <div className={`split-shell${section ? " open" : ""}`}>
      <div className="split-list">
        <div className="sl-head">
          <div className="sl-title">
            <h2>Auto-Reply</h2>
            <span className={`badge ${settings.enabled ? "good" : "off"}`}>{settings.enabled ? "Aktif" : "Mati"}</span>
          </div>
        </div>
        <div className="sl-items">
          {sections.map((s) => (
            <button
              key={s.key}
              className={`split-row${section === s.key ? " active" : ""}`}
              onClick={() => setSection(s.key)}
            >
              <div className="avatar-sm" style={{ background: "var(--wa-panel-2)", color: "var(--ink)", fontSize: "1.1rem" }}>
                {s.emoji}
              </div>
              <div className="sr-body">
                <div className="sr-title">{s.title}</div>
                <div className="sr-sub">{s.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="split-detail">
        {!current ? (
          <div className="sd-empty">
            <div className="sd-emoji"><Bot size={30} strokeWidth={2} /></div>
            <div>
              <strong style={{ display: "block", color: "var(--ink)", marginBottom: 4 }}>Auto-Reply</strong>
              Pilih bagian di kiri untuk mengatur balasan otomatis WhatsApp Anda.
            </div>
          </div>
        ) : (
          <>
            <div className="sd-head">
              <button className="split-back" onClick={() => setSection(null)} aria-label="Kembali">
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
              <div className="avatar-sm" style={{ background: "var(--wa-panel-2)", color: "var(--ink)", fontSize: "1.15rem" }}>
                {current.emoji}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{current.title}</div>
                <div style={{ color: "var(--ink-soft)", fontSize: "0.82rem" }}>{current.sub}</div>
              </div>
            </div>
            <div className="sd-inner">
              {sectionContent[section!]}
              {message && (
                <p style={{ fontSize: "0.82rem", color: message.ok ? "var(--success)" : "var(--danger)" }}>{message.text}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
