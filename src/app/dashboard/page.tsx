"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type SessionStatus =
  | "STOPPED"
  | "STARTING"
  | "SCAN_QR_CODE"
  | "WORKING"
  | "FAILED";

interface SessionInfo {
  name: string;
  status: SessionStatus;
  me?: { id: string; pushName: string } | null;
}

function badgeClass(status: SessionStatus) {
  if (status === "WORKING") return "good";
  if (status === "SCAN_QR_CODE" || status === "STARTING") return "pending";
  if (status === "FAILED") return "bad";
  return "off";
}

function label(status: SessionStatus) {
  return (
    {
      WORKING: "Terhubung",
      SCAN_QR_CODE: "Menunggu scan",
      STARTING: "Memulai",
      FAILED: "Gagal",
      STOPPED: "Terputus",
    } as Record<SessionStatus, string>
  )[status];
}

function initials(text: string) {
  return (
    text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

interface ServerInfo {
  status: { engine?: string } | null;
  version: { version: string; engine?: string } | null;
}

interface UpdateStatus {
  updateAvailable: boolean;
  remotePushedAt: string;
  checkedAt: string;
  checkOk: boolean;
}

interface Me {
  role: "superadmin" | "tenant" | "tenant_staff";
  isOwner: boolean;
  plan: { name: string; deviceLimit: number; monthlyMessageQuota: number | null } | null;
  usage: { messagesSent: number; devices: number };
}

interface DayStat {
  date: string;
  sent: number;
  failed: number;
  received: number;
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [server, setServer] = useState<ServerInfo | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activity, setActivity] = useState<DayStat[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) setSessions(await res.json());
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 6_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    fetch("/api/server")
      .then((r) => r.json())
      .then(setServer)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/waha-update")
      .then((r) => r.json())
      .then(setUpdateStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/reports?days=14")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setActivity(data?.days ?? null))
      .catch(() => {});
  }, []);

  async function action(name: string, verb: "start" | "stop" | "restart") {
    setBusy(name + verb);
    setActionError(null);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(name)}/${verb}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Gagal menjalankan aksi pada "${name}"`);
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menjalankan aksi");
    } finally {
      setBusy(null);
    }
  }

  async function remove(name: string) {
    if (!confirm(`Hapus perangkat "${name}"? Nomor ini harus dipasangkan ulang dari awal.`)) return;
    setBusy(name + "delete");
    setActionError(null);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(name)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Gagal menghapus "${name}"`);
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menghapus perangkat");
    } finally {
      setBusy(null);
    }
  }

  const total = sessions.length;
  const active = sessions.filter((s) => s.status === "WORKING").length;
  const pending = sessions.filter((s) => s.status === "SCAN_QR_CODE" || s.status === "STARTING").length;
  const down = sessions.filter((s) => s.status === "STOPPED" || s.status === "FAILED").length;

  return (
    <div>
      {me?.role === "superadmin" && updateStatus?.updateAvailable && (
        <div className="callout warn">
          <b>Update engine tersedia</b>
          Image <span className="mono">devlikeapro/waha:latest</span> di Docker Hub sudah diperbarui
          {updateStatus.remotePushedAt
            ? ` pada ${new Date(updateStatus.remotePushedAt).toLocaleString("id-ID")}`
            : ""}
          , tapi server ini masih menjalankan versi lama. Update tidak dilakukan otomatis — jalankan{" "}
          <span className="mono">docker pull devlikeapro/waha:latest</span> lalu recreate container saat waktunya
          pas (proses ini akan memutus WA sebentar). Dicek otomatis setiap hari.
        </div>
      )}
      {me?.role !== "superadmin" && me?.plan && (
        <div className="card cpad mb16" style={{ padding: 18 }}>
          <div className="ch">
            <div>
              <span className="chttl">Paket: {me.plan.name}</span>
              <div className="chsub">Pantau pemakaian atau ganti paket kapan saja</div>
            </div>
            {me.isOwner && (
              <Link href="/account/plan" className="btn secondary" style={{ marginLeft: "auto" }}>
                Kelola Paket
              </Link>
            )}
          </div>
          <div className="grid2">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.8rem" }}>
                <span>Perangkat</span>
                <strong>
                  {me.usage.devices} / {me.plan.deviceLimit}
                </strong>
              </div>
              <div className="progress">
                <span style={{ width: `${Math.min(100, (me.usage.devices / me.plan.deviceLimit) * 100)}%` }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.8rem" }}>
                <span>Pesan bulan ini</span>
                <strong>
                  {me.usage.messagesSent} / {me.plan.monthlyMessageQuota ?? "∞"}
                </strong>
              </div>
              <div className="progress">
                <span
                  style={{
                    width: me.plan.monthlyMessageQuota
                      ? `${Math.min(100, (me.usage.messagesSent / me.plan.monthlyMessageQuota) * 100)}%`
                      : "4%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {me?.role === "superadmin" && server?.version && (
        <span className="pill mono" style={{ display: "inline-flex", marginBottom: 14 }}>
          {server.version.engine ?? "WEBJS"} · {server.version.version}
        </span>
      )}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="lbl">Total Perangkat</div>
          <div className="val">{total}</div>
        </div>
        <div className="stat-card">
          <div className="lbl">Terhubung</div>
          <div className="val" style={{ color: active > 0 ? "var(--success)" : "var(--ink)" }}>
            {active}
          </div>
        </div>
        <div className="stat-card">
          <div className="lbl">Menunggu Scan</div>
          <div className="val" style={{ color: pending > 0 ? "var(--warning)" : "var(--ink)" }}>
            {pending}
          </div>
        </div>
        <div className="stat-card">
          <div className="lbl">Terputus / Gagal</div>
          <div className="val" style={{ color: down > 0 ? "var(--danger)" : "var(--ink)" }}>
            {down}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: "0.95rem" }}>Daftar Perangkat</h2>
        <Link href="/connect" className="btn">
          + Tambah Perangkat
        </Link>
      </div>

      {actionError && (
        <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginBottom: 12 }}>{actionError}</p>
      )}

      <div className="table-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>Perangkat</th>
              <th>Nomor</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!loaded && (
              <tr>
                <td colSpan={4} style={{ color: "var(--ink-soft)", textAlign: "center", padding: "32px 16px" }}>
                  Memuat perangkat…
                </td>
              </tr>
            )}
            {loaded && sessions.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--ink-soft)", textAlign: "center", padding: "32px 16px" }}>
                  Belum ada perangkat. <Link href="/connect">Tambah yang pertama</Link>.
                </td>
              </tr>
            )}
            {sessions.map((s) => (
              <tr key={s.name}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="avatar-sm">{initials(s.name)}</div>
                    <strong style={{ fontSize: "0.86rem" }}>{s.name}</strong>
                  </div>
                </td>
                <td className="mono" style={{ color: "var(--ink-soft)" }}>
                  {s.me?.id ? s.me.id.replace(/@.*/, "") : "—"}
                </td>
                <td>
                  <span className={`badge ${badgeClass(s.status)}`}>{label(s.status)}</span>
                </td>
                <td>
                  <div className="actions-cell">
                    {s.status === "STOPPED" || s.status === "FAILED" ? (
                      <button
                        className="btn secondary"
                        onClick={() => action(s.name, "start")}
                        disabled={busy === s.name + "start"}
                      >
                        {busy === s.name + "start" ? "Memulai…" : "Mulai"}
                      </button>
                    ) : (
                      <button
                        className="btn secondary"
                        onClick={() => action(s.name, "stop")}
                        disabled={busy === s.name + "stop"}
                      >
                        {busy === s.name + "stop" ? "Menghentikan…" : "Berhenti"}
                      </button>
                    )}
                    <button
                      className="btn secondary"
                      onClick={() => action(s.name, "restart")}
                      disabled={busy === s.name + "restart"}
                    >
                      Mulai ulang
                    </button>
                    {s.status === "WORKING" && (
                      <Link href={`/inbox?session=${encodeURIComponent(s.name)}`} className="btn secondary">
                        Buka Inbox
                      </Link>
                    )}
                    <button
                      className="btn secondary"
                      style={{ color: "var(--danger)" }}
                      onClick={() => remove(s.name)}
                      disabled={busy === s.name + "delete"}
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activity && activity.length > 0 && (
        <div className="card cpad mb16" style={{ padding: 18, marginTop: 16 }}>
          <div className="ch">
            <div>
              <div className="chttl">Aktivitas Pesan</div>
              <div className="chsub">14 hari terakhir</div>
            </div>
            <Link href="/reports" className="btn secondary" style={{ marginLeft: "auto", padding: "6px 12px", fontSize: "0.78rem" }}>
              Lihat Laporan
            </Link>
          </div>
          <div className="bars" style={{ height: 100 }}>
            {(() => {
              const dayMax = Math.max(1, ...activity.map((x) => x.sent + x.failed));
              return activity.map((d) => (
                <div className="barcol" key={d.date}>
                  <div className="barstack" style={{ height: `${Math.max(2, ((d.sent + d.failed) / dayMax) * 100)}%` }}>
                    {d.failed > 0 && (
                      <div className="bar fail" style={{ height: `${(d.failed / (d.sent + d.failed || 1)) * 100}%` }} />
                    )}
                    {d.sent > 0 && (
                      <div className="bar" style={{ height: `${(d.sent / (d.sent + d.failed || 1)) * 100}%` }} />
                    )}
                  </div>
                  <span className="barlbl">{d.date.slice(5)}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
