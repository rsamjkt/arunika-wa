"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Plan {
  id: string;
  name: string;
  priceRp: number;
  deviceLimit: number;
  monthlyMessageQuota: number | null;
}

interface Tenant {
  id: string;
  username: string;
  createdAt: string;
  subscriptionStatus: "active" | "pending_payment";
  subscriptionExpiresAt: string | null;
  suspended: boolean;
  plan: Plan | null;
  usage: { messagesSent: number; devices: number };
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/tenants")
      .then((r) => r.json())
      .then((data) => {
        setTenants(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  function statusBadge(t: Tenant) {
    if (t.suspended) {
      return <span className="badge off">Nonaktif</span>;
    }
    if (t.subscriptionStatus === "pending_payment") {
      return <span className="badge pending">Menunggu Bayar</span>;
    }
    return <span className="badge good">Aktif</span>;
  }

  return (
    <div>
      <div className="stat-grid mb16">
        <div className="stat-card">
          <div className="lbl">Total Tenant</div>
          <div className="val">{tenants.length}</div>
        </div>
        <div className="stat-card">
          <div className="lbl">Berlangganan Aktif</div>
          <div className="val" style={{ color: "var(--success)" }}>
            {tenants.filter((t) => t.subscriptionStatus === "active" && t.plan && t.plan.priceRp > 0).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="lbl">Menunggu Pembayaran</div>
          <div className="val" style={{ color: "var(--warning)" }}>
            {tenants.filter((t) => t.subscriptionStatus === "pending_payment").length}
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>Username</th>
              <th>Paket</th>
              <th>Status</th>
              <th>Perangkat</th>
              <th>Pesan Bulan Ini</th>
              <th>Berakhir</th>
              <th>Terdaftar</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 700 }}>{t.username}</td>
                <td>
                  <span className="chip">{t.plan?.name ?? "—"}</span>
                </td>
                <td>{statusBadge(t)}</td>
                <td className="mono">
                  {t.usage.devices}
                  {t.plan ? ` / ${t.plan.deviceLimit}` : ""}
                </td>
                <td className="mono">
                  {t.usage.messagesSent}
                  {t.plan?.monthlyMessageQuota ? ` / ${t.plan.monthlyMessageQuota}` : " / ∞"}
                </td>
                <td className="mono" style={{ color: "var(--ink-soft)" }}>
                  {t.subscriptionExpiresAt ? new Date(t.subscriptionExpiresAt).toLocaleDateString("id-ID") : "—"}
                </td>
                <td className="mono" style={{ color: "var(--ink-soft)" }}>
                  {new Date(t.createdAt).toLocaleDateString("id-ID")}
                </td>
                <td className="actions-cell">
                  <Link href={`/admin/tenants/${t.id}`} className="btn secondary">
                    Kelola
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && tenants.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 24 }}>
                  Belum ada tenant yang mendaftar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
