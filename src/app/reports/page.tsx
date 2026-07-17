"use client";

import { useEffect, useState } from "react";
import { ChartColumn } from "lucide-react";

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
  periodDays: number;
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

const PERIODS = [7, 14, 30];

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [period, setPeriod] = useState(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/reports?days=${period}`)
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat laporan");
        return r.json();
      })
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading && !stats) {
    return <p style={{ color: "var(--ink-soft)" }}>Memuat…</p>;
  }
  if (error || !stats) {
    return <p style={{ color: "var(--danger)" }}>Gagal memuat laporan. Coba muat ulang halaman.</p>;
  }

  const maxVal = Math.max(1, ...stats.days.map((d) => d.sent + d.failed), ...stats.days.map((d) => d.received));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14, gap: 8 }}>
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            className="chip"
            style={
              period === p
                ? { background: "var(--success-bg)", color: "var(--success)", fontWeight: 700 }
                : undefined
            }
            onClick={() => setPeriod(p)}
          >
            {p} hari
          </button>
        ))}
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="lbl">Terkirim ({stats.periodDays} hari)</div>
          <div className="val" style={{ color: "var(--success)" }}>
            {stats.totalSent}
          </div>
        </div>
        <div className="stat-card">
          <div className="lbl">Gagal ({stats.periodDays} hari)</div>
          <div className="val" style={{ color: "var(--danger)" }}>
            {stats.totalFailed}
          </div>
        </div>
        <div className="stat-card">
          <div className="lbl">Pesan Masuk ({stats.periodDays} hari)</div>
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
              <div className="chsub">{stats.periodDays} hari terakhir</div>
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
          <div className="stat-grid" style={{ gridTemplateColumns: "1fr", marginBottom: 0 }}>
            <div className="stat-card">
              <div className="lbl">Sedang mengirim</div>
              <div className="val">{stats.activeCampaigns}</div>
            </div>
            <div className="stat-card">
              <div className="lbl">Total campaign dibuat</div>
              <div className="val">{stats.totalCampaigns}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card cpad" style={{ padding: 18 }}>
        <div className="ch">
          <div className="chttl">Template Paling Efektif</div>
        </div>
        {stats.topTemplates.length === 0 ? (
          <div className="empty-state">
            <span className="ic">
              <ChartColumn size={20} />
            </span>
            <div className="ttl">Belum ada template yang dipakai</div>
            <div className="sub">Template yang paling sering dipakai saat mengirim pesan akan muncul di sini.</div>
          </div>
        ) : (
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
            </tbody>
          </table>
        )}
      </div>

      {stats.agentStats.length > 0 && (
        <div className="card cpad" style={{ padding: 18, marginTop: 16 }}>
          <div className="ch">
            <div>
              <div className="chttl">Aktivitas Tim</div>
              <div className="chsub">Pesan manual per anggota, {stats.periodDays} hari terakhir</div>
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
              <div className="chsub">Pesan manual per sumber (dashboard vs API key), {stats.periodDays} hari terakhir</div>
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
