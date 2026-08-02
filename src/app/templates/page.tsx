"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  body: string;
  createdAt: string;
  usedCount: number;
}

const EMPTY = { name: "", category: "", body: "" };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates");
      if (res.ok) setTemplates(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(t: MessageTemplate) {
    setEditingId(t.id);
    setForm({ name: t.name, category: t.category, body: t.body });
    setMessage(null);
    setEditorOpen(true);
  }

  function startNew() {
    setEditingId(null);
    setForm(EMPTY);
    setMessage(null);
    setEditorOpen(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setEditorOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      if (editingId) {
        const res = await fetch(`/api/templates/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Gagal menyimpan template");
        setMessage({ ok: true, text: `Template "${form.name}" diperbarui.` });
      } else {
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Gagal membuat template");
        setMessage({ ok: true, text: `Template "${data.name}" berhasil dibuat.` });
      }
      setEditingId(null);
      setForm(EMPTY);
      setEditorOpen(false);
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menyimpan" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(t: MessageTemplate) {
    if (!confirm(`Hapus template "${t.name}"?`)) return;
    setBusy(t.id);
    try {
      await fetch(`/api/templates/${t.id}`, { method: "DELETE" });
      if (editingId === t.id) cancelEdit();
      await load();
    } finally {
      setBusy(null);
    }
  }

  function insertVar(v: string) {
    setForm((f) => ({ ...f, body: f.body + v }));
  }

  return (
    <div className={`split-shell${editorOpen ? " open" : ""}`}>
      <div className="split-list">
        <div className="sl-head">
          <div className="sl-title">
            <h2>Template</h2>
            <button className="btn" onClick={startNew}>
              + Baru
            </button>
          </div>
        </div>
        <div className="sl-items">
          {loading && (
            <p style={{ textAlign: "center", color: "var(--ink-soft)", padding: "28px 16px", fontSize: "0.85rem" }}>
              Memuat template…
            </p>
          )}
          {!loading && templates.length === 0 && (
            <div className="empty-state" style={{ padding: "36px 20px" }}>
              <span className="ic">
                <FileText size={20} />
              </span>
              <div className="ttl">Belum ada template</div>
              <div className="sub">Klik "+ Baru" untuk membuat template pertama yang bisa dipakai ulang saat Kirim Pesan atau Broadcast.</div>
            </div>
          )}
          {!loading &&
            templates.map((t) => (
              <button
                key={t.id}
                className={`split-row${editingId === t.id ? " active" : ""}`}
                onClick={() => startEdit(t)}
              >
                <div className="sr-body">
                  <div className="sr-title">{t.name}</div>
                  <div className="sr-sub">{t.body}</div>
                </div>
                <span className="chip" style={{ fontSize: "0.62rem" }}>
                  {t.category || "—"}
                </span>
              </button>
            ))}
        </div>
      </div>

      <div className="split-detail">
        {!editorOpen ? (
          <div className="sd-empty">
            <div className="sd-emoji">📝</div>
            <div>
              <strong style={{ display: "block", color: "var(--ink)", marginBottom: 4 }}>Kelola template</strong>
              Pilih template di kiri untuk mengubahnya, atau klik "+ Baru" untuk membuat template baru.
            </div>
          </div>
        ) : (
          <>
            <div className="sd-head">
              <button className="split-back" onClick={cancelEdit} aria-label="Kembali">
                ‹
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{editingId ? "Ubah template" : "Buat template baru"}</div>
                <div style={{ color: "var(--ink-soft)", fontSize: "0.82rem" }}>Bisa dipakai ulang saat Kirim Pesan atau Broadcast.</div>
              </div>
              {editingId && (
                <button
                  className="btn danger"
                  style={{ marginLeft: "auto" }}
                  disabled={busy === editingId}
                  onClick={() => {
                    const t = templates.find((x) => x.id === editingId);
                    if (t) remove(t);
                  }}
                >
                  Hapus
                </button>
              )}
            </div>
            <div className="sd-inner">
              <form onSubmit={submit}>
                <div className="grid2" style={{ marginBottom: 14 }}>
                  <div>
                    <label className="lbl">Nama template</label>
                    <input
                      className="field"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Promo Gajian"
                    />
                  </div>
                  <div>
                    <label className="lbl">Kategori</label>
                    <input
                      className="field"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      placeholder="Promosi, Notifikasi, dll"
                    />
                  </div>
                </div>
                <label className="lbl">Isi pesan</label>
                <textarea
                  className="compose"
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Halo {nama}! Ada promo spesial untuk Anda..."
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 11 }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--ink-soft)", alignSelf: "center" }}>
                    Variabel:
                  </span>
                  <button type="button" className="varchip" onClick={() => insertVar("{nama}")}>
                    {"{nama}"}
                  </button>
                  <button type="button" className="varchip" onClick={() => insertVar("{nomor}")}>
                    {"{nomor}"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  <button className="btn" type="submit" disabled={saving || !form.name.trim() || !form.body.trim()}>
                    {saving ? "Menyimpan…" : editingId ? "Update Template" : "Simpan Template"}
                  </button>
                  <button type="button" className="btn secondary" onClick={cancelEdit}>
                    Batal
                  </button>
                </div>
              </form>
              {message && (
                <p style={{ marginTop: 12, fontSize: "0.82rem", color: message.ok ? "var(--success)" : "var(--danger)" }}>
                  {message.text}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
