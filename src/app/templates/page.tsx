"use client";

import { useCallback, useEffect, useState } from "react";

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
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
    <div>
      <div className="card cpad mb16" style={{ padding: 22 }}>
        <div className="ch">
          <div>
            <h2 style={{ fontSize: "1rem" }}>{editingId ? "Ubah template" : "Buat template baru"}</h2>
            <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: 4 }}>
              Template bisa dipakai ulang saat Kirim Pesan atau Broadcast.
            </p>
          </div>
        </div>
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
            {editingId && (
              <button type="button" className="btn secondary" onClick={cancelEdit}>
                Batal
              </button>
            )}
          </div>
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
              <th>Kategori</th>
              <th>Pratinjau</th>
              <th>Dipakai</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 700 }}>{t.name}</td>
                <td>
                  <span className="chip">{t.category}</span>
                </td>
                <td style={{ maxWidth: 320, color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.body}
                </td>
                <td className="mono" style={{ color: "var(--ink-soft)" }}>
                  {t.usedCount}x
                </td>
                <td className="actions-cell">
                  <button className="btn secondary" onClick={() => startEdit(t)}>
                    Ubah
                  </button>
                  <button className="btn danger" disabled={busy === t.id} onClick={() => remove(t)}>
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {!loading && templates.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 24 }}>
                  Belum ada template.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
