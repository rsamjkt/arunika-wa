"use client";

import { useEffect, useState } from "react";

interface DayStat {
  date: string;
  sent: number;
  failed: number;
  received: number;
}
interface TopTemplate {
  id: string;
  name: string;
  usedCount: number;
}
interface AgentStat {
  actorId: string;
  name: string;
  sent: number;
  failed: number;
}
interface ApiKeyStat {
  apiKeyId: string;
  name: string;
  sent: number;
  failed: number;
}
interface ReportStats {
  days: DayStat[];
  totalSent: number;
  totalFailed: number;
  totalReceived: number;
  successRate: number;
  topTemplates: TopTemplate[];
  activeCampaigns: number;
  totalCampaigns: number;
  agentStats: AgentStat[];
  apiKeyStats: ApiKeyStat[];
}

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat laporan");
        return r.json();
      })
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p style={{ color: "var(--ink-soft)" }}>Memuat…</p>;
  }
  if (error || !stats) {
    return <p style={{ color: "var(--danger)" }}>Gagal memuat laporan. Coba muat ulang halaman.</p>;
  }

  const maxVal = Math.max(1, ...stats.days.map((d) => d.sent + d.failed), ...stats.days.map((d) => d.received));

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="lbl">Terkirim (14 hari)</div>
          <div className="val" style={{ color: "var(--success)" }}>
            {stats.totalSent}
          </div>
        </div>
        <div className="stat-card">
          <div className="lbl">Gagal (14 hari)</div>
          <div className="val" style={{ color: "var(--danger)" }}>
            {stats.totalFailed}
          </div>
        </div>
        <div className="stat-card">
          <div className="lbl">Pesan Masuk (14 hari)</div>
          <div className="val" style={{ color: "var(--info)" }}>
            {stats.totalReceived}
          </div>
        </div>
        <div className="stat-card">
          <div className="lbl">Tingkat Keberhasilan</div>
          <div className="val">{Math.round(stats.successRate * 100)}%</div>
        </div>
      </div>

      <div className="grid2 mb16" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <div className="card cpad" style={{ padding: 18 }}>
          <div className="ch">
            <div>
              <div className="chttl">Volume Pesan</div>
              <div className="chsub">14 hari terakhir</div>
            </div>
            <div style={{ display: "flex", gap: 14, marginLeft: "auto" }}>
              <div className="leg">
                <span className="lgd" style={{ background: "var(--primary)" }} />
                Terkirim
              </div>
              <div className="leg">
                <span className="lgd" style={{ background: "var(--danger)" }} />
                Gagal
              </div>
              <div className="leg">
                <span className="lgd" style={{ background: "var(--info)" }} />
                Masuk
              </div>
            </div>
          </div>
          <div className="bars">
            {stats.days.map((d) => (
              <div className="barcol" key={d.date}>
                <div className="barstack" style={{ height: `${Math.max(2, ((d.sent + d.failed) / maxVal) * 100)}%` }}>
                  {d.failed > 0 && (
                    <div
                      className="bar fail"
                      style={{ height: `${(d.failed / (d.sent + d.failed || 1)) * 100}%` }}
                    />
                  )}
                  {d.sent > 0 && (
                    <div className="bar" style={{ height: `${(d.sent / (d.sent + d.failed || 1)) * 100}%` }} />
                  )}
                </div>
                <span className="barlbl">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card cpad" style={{ padding: 18 }}>
          <div className="ch">
            <div className="chttl">Ringkasan Campaign</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800 }} className="mono">
                {stats.activeCampaigns}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>Sedang mengirim</div>
            </div>
            <div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800 }} className="mono">
                {stats.totalCampaigns}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>Total campaign dibuat</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card cpad" style={{ padding: 18 }}>
        <div className="ch">
          <div className="chttl">Template Paling Efektif</div>
        </div>
        <table className="dtable">
          <thead>
            <tr>
              <th>Template</th>
              <th>Dipakai</th>
            </tr>
          </thead>
          <tbody>
            {stats.topTemplates.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 700 }}>{t.name}</td>
                <td className="mono">{t.usedCount}x</td>
              </tr>
            ))}
            {stats.topTemplates.length === 0 && (
              <tr>
                <td colSpan={2} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 20 }}>
                  Belum ada template yang dipakai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {stats.agentStats.length > 0 && (
        <div className="card cpad" style={{ padding: 18, marginTop: 16 }}>
          <div className="ch">
            <div>
              <div className="chttl">Aktivitas Tim</div>
              <div className="chsub">Pesan manual per anggota, 14 hari terakhir</div>
            </div>
          </div>
          <table className="dtable">
            <thead>
              <tr>
                <th>Anggota</th>
                <th>Terkirim</th>
                <th>Gagal</th>
              </tr>
            </thead>
            <tbody>
              {stats.agentStats.map((a) => (
                <tr key={a.actorId}>
                  <td style={{ fontWeight: 700 }}>{a.name}</td>
                  <td className="mono" style={{ color: "var(--success)" }}>
                    {a.sent}
                  </td>
                  <td className="mono" style={{ color: a.failed > 0 ? "var(--danger)" : "var(--ink-soft)" }}>
                    {a.failed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stats.apiKeyStats.length > 0 && (
        <div className="card cpad" style={{ padding: 18, marginTop: 16 }}>
          <div className="ch">
            <div>
              <div className="chttl">Penggunaan API</div>
              <div className="chsub">Pesan manual per sumber (dashboard vs API key), 14 hari terakhir</div>
            </div>
          </div>
          <table className="dtable">
            <thead>
              <tr>
                <th>Sumber</th>
                <th>Terkirim</th>
                <th>Gagal</th>
              </tr>
            </thead>
            <tbody>
              {stats.apiKeyStats.map((s) => (
                <tr key={s.apiKeyId}>
                  <td style={{ fontWeight: 700 }}>
                    {s.apiKeyId === "dashboard" ? s.name : <span className="mono">{s.name}</span>}
                  </td>
                  <td className="mono" style={{ color: "var(--success)" }}>
                    {s.sent}
                  </td>
                  <td className="mono" style={{ color: s.failed > 0 ? "var(--danger)" : "var(--ink-soft)" }}>
                    {s.failed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: "0.75rem", color: "var(--ink-soft)", marginTop: 10 }}>
            Kelola API key di{" "}
            <a href="/settings/api-keys" style={{ color: "var(--primary)" }}>
              Pengaturan → API Key
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
