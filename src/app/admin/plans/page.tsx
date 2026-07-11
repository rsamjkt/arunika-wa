"use client";

import { useCallback, useEffect, useState } from "react";

const FEATURE_OPTIONS: { key: string; label: string }[] = [
  { key: "broadcast", label: "Broadcast / Campaign" },
  { key: "templates", label: "Template Pesan" },
  { key: "autoreply", label: "Auto-Reply Bot" },
  { key: "apikeys", label: "API Key" },
  { key: "webhook", label: "Webhook Keluar" },
];

interface Plan {
  id: string;
  name: string;
  priceRp: number;
  durationDays: number | null;
  deviceLimit: number;
  monthlyMessageQuota: number | null;
  features: string[];
  isFree: boolean;
}

const EMPTY = {
  name: "",
  priceRp: "0",
  durationDays: "30",
  deviceLimit: "1",
  monthlyMessageQuota: "",
  features: [] as string[],
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plans");
      if (res.ok) setPlans(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleFeature(key: string) {
    setForm((f) => ({
      ...f,
      features: f.features.includes(key) ? f.features.filter((k) => k !== key) : [...f.features, key],
    }));
  }

  function startEdit(p: Plan) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      priceRp: String(p.priceRp),
      durationDays: p.durationDays !== null ? String(p.durationDays) : "",
      deviceLimit: String(p.deviceLimit),
      monthlyMessageQuota: p.monthlyMessageQuota !== null ? String(p.monthlyMessageQuota) : "",
      features: p.features,
    });
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
    const body = {
      name: form.name,
      priceRp: Number(form.priceRp) || 0,
      durationDays: form.durationDays.trim() === "" ? null : Number(form.durationDays),
      deviceLimit: Number(form.deviceLimit) || 1,
      monthlyMessageQuota: form.monthlyMessageQuota.trim() === "" ? null : Number(form.monthlyMessageQuota),
      features: form.features,
    };
    try {
      const res = editingId
        ? await fetch(`/api/plans/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/plans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan paket");
      setMessage({ ok: true, text: editingId ? "Paket diperbarui." : `Paket "${form.name}" dibuat.` });
      cancelEdit();
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menyimpan" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Plan) {
    if (!confirm(`Hapus paket "${p.name}"?`)) return;
    try {
      const res = await fetch(`/api/plans/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menghapus paket");
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menghapus" });
    }
  }

  return (
    <div>
      <div className="card cpad mb16" style={{ padding: 22 }}>
        <div className="ch">
          <h2 style={{ fontSize: "1rem" }}>{editingId ? "Ubah paket" : "Buat paket baru"}</h2>
        </div>
        <form onSubmit={submit}>
          <div className="grid2" style={{ marginBottom: 14 }}>
            <div>
              <label className="lbl">Nama paket</label>
              <input
                className="field"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Bisnis"
              />
            </div>
            <div>
              <label className="lbl">Harga (Rp, per bulan; 0 = gratis)</label>
              <input
                type="number"
                className="field"
                value={form.priceRp}
                onChange={(e) => setForm((f) => ({ ...f, priceRp: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid2" style={{ marginBottom: 14 }}>
            <div>
              <label className="lbl">Durasi (hari, kosongkan untuk paket gratis)</label>
              <input
                type="number"
                className="field"
                value={form.durationDays}
                onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
              />
            </div>
            <div>
              <label className="lbl">Batas jumlah perangkat WA</label>
              <input
                type="number"
                className="field"
                value={form.deviceLimit}
                onChange={(e) => setForm((f) => ({ ...f, deviceLimit: e.target.value }))}
              />
            </div>
          </div>
          <label className="lbl">Kuota pesan/bulan (kosongkan = tanpa batas)</label>
          <input
            type="number"
            className="field"
            style={{ marginBottom: 14 }}
            value={form.monthlyMessageQuota}
            onChange={(e) => setForm((f) => ({ ...f, monthlyMessageQuota: e.target.value }))}
          />
          <label className="lbl">Fitur yang termasuk</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {FEATURE_OPTIONS.map((f) => (
              <button
                key={f.key}
                type="button"
                className="chip"
                style={
                  form.features.includes(f.key)
                    ? { background: "var(--success-bg)", color: "var(--success)", fontWeight: 700 }
                    : undefined
                }
                onClick={() => toggleFeature(f.key)}
              >
                {form.features.includes(f.key) ? "✓ " : ""}
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" type="submit" disabled={saving || !form.name.trim()}>
              {saving ? "Menyimpan…" : editingId ? "Update Paket" : "Simpan Paket"}
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
              <th>Harga</th>
              <th>Durasi</th>
              <th>Perangkat</th>
              <th>Kuota</th>
              <th>Fitur</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 700 }}>
                  {p.name} {p.isFree && <span className="badge off">Free</span>}
                </td>
                <td className="mono">{p.priceRp === 0 ? "Gratis" : `Rp${p.priceRp.toLocaleString("id-ID")}`}</td>
                <td>{p.durationDays ? `${p.durationDays} hari` : "—"}</td>
                <td>{p.deviceLimit}</td>
                <td>{p.monthlyMessageQuota ?? "Tanpa batas"}</td>
                <td style={{ maxWidth: 220 }}>
                  {p.features.length === 0
                    ? "—"
                    : p.features.map((f) => FEATURE_OPTIONS.find((o) => o.key === f)?.label ?? f).join(", ")}
                </td>
                <td className="actions-cell">
                  <button className="btn secondary" onClick={() => startEdit(p)}>
                    Ubah
                  </button>
                  {!p.isFree && (
                    <button className="btn danger" onClick={() => remove(p)}>
                      Hapus
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && plans.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 24 }}>
                  Belum ada paket.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
