"use client";

import { useEffect, useRef, useState } from "react";

type LeadCategory = "company" | "school" | "hospital";
type LeadStatus = "new" | "contacted" | "failed" | "opted_out";

interface Lead {
  id: string;
  name: string;
  category: LeadCategory;
  area: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  source: "google_places" | "csv";
  status: LeadStatus;
  lastError: string | null;
  contactedAt: string | null;
  createdAt: string;
}

const CATEGORY_LABEL: Record<LeadCategory, string> = {
  company: "Perusahaan",
  school: "Sekolah",
  hospital: "Rumah Sakit",
};

function statusBadge(status: LeadStatus) {
  if (status === "contacted") return <span className="badge good">Terkirim</span>;
  if (status === "failed") return <span className="badge bad">Gagal</span>;
  if (status === "opted_out") return <span className="badge off">Opt-out</span>;
  return <span className="badge pending">Baru</span>;
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<LeadCategory>("company");
  const [area, setArea] = useState("Jakarta Selatan");
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch("/api/admin/leads")
      .then((r) => r.json())
      .then((data) => {
        setLeads(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function search() {
    setSearching(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, area }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mencari leads");
      setMessage(
        `Ditemukan ${data.found} tempat, ${data.added} lead baru ditambahkan. Penawaran akan dikirim otomatis bertahap oleh cron.`,
      );
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mencari leads");
    } finally {
      setSearching(false);
    }
  }

  function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    setMessage(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch("/api/admin/leads/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv: String(reader.result ?? "") }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Gagal import CSV");
        setMessage(`${data.added} lead ditambahkan dari CSV, ${data.skipped} dilewati (duplikat/tidak valid).`);
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal import CSV");
      } finally {
        setImporting(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  const counts = {
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    failed: leads.filter((l) => l.status === "failed").length,
    optedOut: leads.filter((l) => l.status === "opted_out").length,
  };

  return (
    <div>
      <div className="stat-grid mb16">
        <div className="stat-card">
          <div className="lbl">Total Lead</div>
          <div className="val">{leads.length}</div>
        </div>
        <div className="stat-card">
          <div className="lbl">Menunggu Dikirim</div>
          <div className="val" style={{ color: "var(--warning)" }}>{counts.new}</div>
        </div>
        <div className="stat-card">
          <div className="lbl">Sudah Dikirim</div>
          <div className="val" style={{ color: "var(--success)" }}>{counts.contacted}</div>
        </div>
        <div className="stat-card">
          <div className="lbl">Opt-out</div>
          <div className="val" style={{ color: "var(--ink-soft)" }}>{counts.optedOut}</div>
        </div>
      </div>

      <div className="card cpad mb16" style={{ padding: 20 }}>
        <h2 style={{ fontSize: "1rem", marginBottom: 4 }}>Cari Leads dari Google Maps</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginBottom: 14 }}>
          Lead baru otomatis dikirimi penawaran bertahap oleh cron (tidak langsung/sekaligus), agar nomor pengirim
          tidak terkena limit spam WhatsApp.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: "0.78rem", display: "block", marginBottom: 4 }}>Kategori</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as LeadCategory)}>
              <option value="company">Perusahaan</option>
              <option value="school">Sekolah</option>
              <option value="hospital">Rumah Sakit</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.78rem", display: "block", marginBottom: 4 }}>Area</label>
            <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="mis. Jakarta Selatan" />
          </div>
          <button className="btn" disabled={searching} onClick={search}>
            {searching ? "Mencari…" : "Cari Leads"}
          </button>
        </div>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <label style={{ fontSize: "0.78rem", display: "block", marginBottom: 4 }}>
            Atau import CSV (kolom: name,category,phone,email,address)
          </label>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={importCsv} disabled={importing} />
        </div>

        {message && <p style={{ color: "var(--success)", fontSize: "0.82rem", marginTop: 12 }}>{message}</p>}
        {error && <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginTop: 12 }}>{error}</p>}
      </div>

      <div className="table-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Kategori</th>
              <th>Area</th>
              <th>Kontak</th>
              <th>Sumber</th>
              <th>Status</th>
              <th>Dikirim</th>
            </tr>
          </thead>
          <tbody>
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "32px 16px", color: "var(--ink-soft)" }}>
                  Belum ada lead. Cari dari Google Maps atau import CSV.
                </td>
              </tr>
            )}
            {leads.map((l) => (
              <tr key={l.id}>
                <td style={{ fontWeight: 700 }}>{l.name}</td>
                <td>{CATEGORY_LABEL[l.category]}</td>
                <td>{l.area}</td>
                <td className="mono" style={{ fontSize: "0.78rem" }}>
                  {l.phone ?? "—"}
                  {l.email ? ` · ${l.email}` : ""}
                </td>
                <td>{l.source === "google_places" ? "Google Maps" : "CSV"}</td>
                <td>{statusBadge(l.status)}</td>
                <td className="mono" style={{ fontSize: "0.78rem" }}>
                  {l.contactedAt ? new Date(l.contactedAt).toLocaleString("id-ID") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
