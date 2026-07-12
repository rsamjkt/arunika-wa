"use client";

import { useEffect, useState } from "react";

interface Referral {
  id: string;
  referredUsername: string;
  createdAt: string;
}

interface ReferralData {
  code: string;
  referrals: Referral[];
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/referrals")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <p style={{ color: "var(--ink-soft)" }}>Memuat…</p>;
  }

  const link = `${origin}/register?ref=${data.code}`;

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div>
      <div className="card cpad mb16" style={{ padding: 22 }}>
        <div className="ch">
          <div>
            <h2 style={{ fontSize: "1rem" }}>Program Referral</h2>
            <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: 4 }}>
              Ajak orang lain daftar pakai kode/link Anda — setiap orang yang berhasil daftar, Anda dapat{" "}
              <b>bonus 7 hari</b> masa aktif paket secara otomatis.
            </p>
          </div>
        </div>

        <label className="lbl">Kode referral Anda</label>
        <div className="chip" style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: 14, width: "fit-content" }}>
          {data.code}
        </div>

        <label className="lbl">Link pendaftaran</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <code
            className="mono"
            style={{
              flex: 1,
              fontSize: "0.8rem",
              background: "var(--bg)",
              padding: "8px 12px",
              borderRadius: 8,
              boxShadow: "inset 0 0 0 1px var(--border)",
              overflowX: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {link}
          </code>
          <button className="btn secondary" onClick={copyLink}>
            {copied ? "Tersalin!" : "Salin"}
          </button>
        </div>
      </div>

      <div className="card cpad" style={{ padding: 22 }}>
        <div className="ch">
          <h2 style={{ fontSize: "1rem" }}>
            Sudah Mengajak ({data.referrals.length})
          </h2>
        </div>
        <table className="dtable">
          <thead>
            <tr>
              <th>Username</th>
              <th>Bergabung</th>
            </tr>
          </thead>
          <tbody>
            {data.referrals.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 700 }}>{r.referredUsername}</td>
                <td className="mono" style={{ color: "var(--ink-soft)" }}>
                  {new Date(r.createdAt).toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
            {data.referrals.length === 0 && (
              <tr>
                <td colSpan={2} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 24 }}>
                  Belum ada yang mendaftar pakai kode Anda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
