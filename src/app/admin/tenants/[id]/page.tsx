"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Plan {
  id: string;
  name: string;
  priceRp: number;
  durationDays: number | null;
  deviceLimit: number;
  monthlyMessageQuota: number | null;
}

interface StaffMember {
  id: string;
  username: string;
  email: string | null;
  createdAt: string;
}

interface SessionRow {
  name: string;
  status: string;
}

interface Transaction {
  orderId: string;
  planId: string;
  amount: number;
  status: "PENDING" | "PAID" | "EXPIRED";
  createdAt: string;
  paidAt: string | null;
}

interface TenantDetail {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  subscriptionStatus: "active" | "pending_payment";
  subscriptionExpiresAt: string | null;
  suspended: boolean;
  plan: Plan | null;
  usage: { messagesSent: number; devices: number };
  staff: StaffMember[];
  sessions: SessionRow[];
  transactions: Transaction[];
}

export default function AdminTenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setTenant(data);
      setSelectedPlanId(data.plan?.id ?? "");
      setExpiresAt(data.subscriptionExpiresAt ? data.subscriptionExpiresAt.slice(0, 10) : "");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    fetch("/api/plans")
      .then((r) => r.json())
      .then(setPlans);
  }, [load]);

  async function changePlan(e: React.FormEvent) {
    e.preventDefault();
    setBusy("plan");
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          subscriptionExpiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengubah paket");
      setMessage({ ok: true, text: "Paket & masa aktif berhasil diperbarui." });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal mengubah paket" });
    } finally {
      setBusy(null);
    }
  }

  async function toggleSuspend() {
    if (!tenant) return;
    const nextSuspended = !tenant.suspended;
    if (
      nextSuspended &&
      !confirm(`Nonaktifkan akun "${tenant.username}"? Mereka (dan staf mereka) tidak akan bisa login sampai diaktifkan lagi.`)
    ) {
      return;
    }
    setBusy("suspend");
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: nextSuspended }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengubah status");
      setMessage({ ok: true, text: nextSuspended ? "Akun dinonaktifkan." : "Akun diaktifkan kembali." });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal mengubah status" });
    } finally {
      setBusy(null);
    }
  }

  async function resetPassword() {
    if (!tenant) return;
    const newPassword = window.prompt(`Password baru untuk "${tenant.username}" (min. 6 karakter):`);
    if (!newPassword) return;
    setBusy("reset");
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal reset password");
      setMessage({ ok: true, text: "Password berhasil direset. Sesi login mereka saat ini telah diputus." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal reset password" });
    } finally {
      setBusy(null);
    }
  }

  async function deleteTenant() {
    if (!tenant) return;
    const typed = window.prompt(
      `Tindakan ini akan menghapus akun "${tenant.username}" beserta seluruh datanya (perangkat, template, campaign, staf, dll) secara permanen dan tidak bisa dibatalkan.\n\nKetik username "${tenant.username}" untuk konfirmasi:`,
    );
    if (typed !== tenant.username) {
      if (typed !== null) alert("Username tidak cocok. Penghapusan dibatalkan.");
      return;
    }
    setBusy("delete");
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menghapus tenant");
      router.push("/admin/tenants");
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menghapus tenant" });
      setBusy(null);
    }
  }

  if (loading) return <p style={{ color: "var(--ink-soft)" }}>Memuat…</p>;
  if (notFound || !tenant) {
    return (
      <div className="card cpad" style={{ padding: 22 }}>
        <p style={{ color: "var(--ink-soft)" }}>Tenant tidak ditemukan.</p>
        <Link href="/admin/tenants" className="btn secondary" style={{ marginTop: 12 }}>
          Kembali
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="ch mb16">
        <div>
          <span className="chttl">{tenant.username}</span>
          <div className="chsub">
            {tenant.email ?? "—"} {tenant.phone ? `· ${tenant.phone}` : ""} · Terdaftar{" "}
            {new Date(tenant.createdAt).toLocaleDateString("id-ID")}
          </div>
        </div>
        <span className={`badge ${tenant.suspended ? "off" : tenant.subscriptionStatus === "pending_payment" ? "pending" : "good"}`} style={{ marginLeft: "auto" }}>
          {tenant.suspended ? "Nonaktif" : tenant.subscriptionStatus === "pending_payment" ? "Menunggu Bayar" : "Aktif"}
        </span>
      </div>

      {message && (
        <p style={{ marginBottom: 14, fontSize: "0.85rem", color: message.ok ? "var(--success)" : "var(--danger)" }}>
          {message.text}
        </p>
      )}

      <div className="grid2 mb16">
        <div className="card cpad" style={{ padding: 20 }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 12 }}>Paket & Masa Aktif</h2>
          <form onSubmit={changePlan} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label>Paket</label>
              <select className="field" value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.priceRp > 0 ? `— Rp${p.priceRp.toLocaleString("id-ID")}/bulan` : "— Gratis"}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label>Aktif sampai (kosongkan untuk tanpa batas)</label>
              <input
                type="date"
                className="field"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <button className="btn" type="submit" disabled={busy === "plan"}>
              {busy === "plan" ? "Menyimpan…" : "Simpan Paket"}
            </button>
          </form>
          <p style={{ fontSize: "0.75rem", color: "var(--ink-soft)", marginTop: 10 }}>
            Mengubah paket di sini langsung aktif tanpa proses pembayaran — untuk kompensasi, upgrade manual, dll.
          </p>
        </div>

        <div className="card cpad" style={{ padding: 20 }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 12 }}>Pemakaian</h2>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.82rem" }}>
              <span>Perangkat</span>
              <strong>
                {tenant.usage.devices} / {tenant.plan?.deviceLimit ?? "—"}
              </strong>
            </div>
            <div className="progress">
              <span
                style={{
                  width: tenant.plan ? `${Math.min(100, (tenant.usage.devices / tenant.plan.deviceLimit) * 100)}%` : "0%",
                }}
              />
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.82rem" }}>
              <span>Pesan bulan ini</span>
              <strong>
                {tenant.usage.messagesSent} / {tenant.plan?.monthlyMessageQuota ?? "∞"}
              </strong>
            </div>
            <div className="progress">
              <span
                style={{
                  width:
                    tenant.plan?.monthlyMessageQuota
                      ? `${Math.min(100, (tenant.usage.messagesSent / tenant.plan.monthlyMessageQuota) * 100)}%`
                      : "4%",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card cpad mb16" style={{ padding: 20 }}>
        <h2 style={{ fontSize: "0.95rem", marginBottom: 12 }}>Aksi Akun</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn secondary" disabled={busy === "suspend"} onClick={toggleSuspend}>
            {tenant.suspended ? "Aktifkan Kembali" : "Nonaktifkan Akun"}
          </button>
          <button className="btn secondary" disabled={busy === "reset"} onClick={resetPassword}>
            Reset Password
          </button>
          <button className="btn danger" disabled={busy === "delete"} onClick={deleteTenant} style={{ marginLeft: "auto" }}>
            Hapus Tenant
          </button>
        </div>
      </div>

      <div className="grid2 mb16">
        <div className="card cpad" style={{ padding: 20 }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 12 }}>Perangkat WhatsApp ({tenant.sessions.length})</h2>
          {tenant.sessions.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>Belum ada perangkat.</p>
          ) : (
            <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tenant.sessions.map((s) => (
                <li key={s.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span className="mono">{s.name}</span>
                  <span className="badge pending">{s.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card cpad" style={{ padding: 20 }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 12 }}>Staf / Tim ({tenant.staff.length})</h2>
          {tenant.staff.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>Belum ada staf.</p>
          ) : (
            <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tenant.staff.map((s) => (
                <li key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <strong>{s.username}</strong>
                  <span style={{ color: "var(--ink-soft)" }}>{s.email ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card cpad" style={{ padding: 20 }}>
        <h2 style={{ fontSize: "0.95rem", marginBottom: 12 }}>Transaksi Terakhir</h2>
        {tenant.transactions.length === 0 ? (
          <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>Belum ada transaksi.</p>
        ) : (
          <div className="table-wrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Jumlah</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {tenant.transactions.map((t) => (
                  <tr key={t.orderId}>
                    <td className="mono">{t.orderId}</td>
                    <td className="mono">Rp{t.amount.toLocaleString("id-ID")}</td>
                    <td>
                      <span
                        className={`badge ${t.status === "PAID" ? "good" : t.status === "EXPIRED" ? "off" : "pending"}`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="mono" style={{ color: "var(--ink-soft)" }}>
                      {new Date(t.createdAt).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
