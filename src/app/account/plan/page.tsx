"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const FEATURE_LABELS: Record<string, string> = {
  broadcast: "Broadcast / Campaign",
  templates: "Template Pesan",
  autoreply: "Auto-Reply Bot",
  apikeys: "API Key",
  webhook: "Webhook Keluar",
};

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

interface Me {
  role: "superadmin" | "tenant" | "tenant_staff";
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  plan: Plan | null;
  pendingOrderId: string | null;
  usage: { messagesSent: number; devices: number };
}

export default function AccountPlanPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/plans").then((r) => r.json()),
    ]).then(([meData, plansData]) => {
      setMe(meData);
      setPlans(plansData);
      setLoading(false);
    });
  }, []);

  async function upgrade(plan: Plan) {
    setUpgrading(plan.id);
    setError(null);
    try {
      const res = await fetch("/api/account/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal upgrade paket");
      if (data.requiresPayment) {
        router.push(`/register/pay/${data.orderId}?redirect=${encodeURIComponent("/account/plan?upgraded=1")}`);
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal upgrade paket");
      setUpgrading(null);
    }
  }

  if (loading || !me) {
    return <p style={{ color: "var(--ink-soft)" }}>Memuat…</p>;
  }

  if (me.role === "superadmin") {
    return (
      <div className="card cpad" style={{ padding: 22 }}>
        <p style={{ color: "var(--ink-soft)" }}>
          Akun superadmin tidak terikat paket — akses penuh ke semua fitur.
        </p>
      </div>
    );
  }

  if (me.role === "tenant_staff") {
    return (
      <div className="card cpad" style={{ padding: 22 }}>
        <p style={{ color: "var(--ink-soft)" }}>
          Paket & tagihan hanya bisa dikelola oleh pemilik akun.
        </p>
      </div>
    );
  }

  const plan = me.plan;

  return (
    <div>
      {me.subscriptionStatus === "pending_payment" && me.pendingOrderId && (
        <div
          className="callout"
          style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}
        >
          <span>
            <b>Ada tagihan menunggu pembayaran.</b> Paket baru Anda aktif setelah pembayaran QRIS diterima — sampai
            saat itu akun Anda memakai batas paket Free.
          </span>
          <a href={`/register/pay/${me.pendingOrderId}`} className="btn" style={{ flexShrink: 0 }}>
            Selesaikan Pembayaran
          </a>
        </div>
      )}
      {plan && (
        <div className="card cpad mb16" style={{ padding: 22 }}>
          <div className="ch">
            <div>
              <h2 style={{ fontSize: "1.1rem" }}>Paket Anda saat ini: {plan.name}</h2>
              {plan.durationDays && me.subscriptionExpiresAt && (
                <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: 4 }}>
                  Perpanjangan berikutnya {new Date(me.subscriptionExpiresAt).toLocaleDateString("id-ID")}
                </p>
              )}
            </div>
          </div>
          <div className="grid2" style={{ marginTop: 16 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.82rem" }}>
                <span>Perangkat</span>
                <strong>
                  {me.usage.devices} / {plan.deviceLimit}
                </strong>
              </div>
              <div className="progress">
                <span style={{ width: `${Math.min(100, (me.usage.devices / plan.deviceLimit) * 100)}%` }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.82rem" }}>
                <span>Pesan bulan ini</span>
                <strong>
                  {me.usage.messagesSent.toLocaleString("id-ID")} /{" "}
                  {plan.monthlyMessageQuota ? plan.monthlyMessageQuota.toLocaleString("id-ID") : "∞"}
                </strong>
              </div>
              <div className="progress">
                <span
                  style={{
                    width: plan.monthlyMessageQuota
                      ? `${Math.min(100, (me.usage.messagesSent / plan.monthlyMessageQuota) * 100)}%`
                      : "4%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: "1rem", marginBottom: 12 }}>Semua Paket</h2>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginBottom: 12 }}>{error}</p>}
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        {plans.map((p) => {
          const isCurrent = plan?.id === p.id;
          return (
            <div key={p.id} className="card" style={{ padding: 18, border: isCurrent ? "2px solid var(--primary)" : undefined }}>
              <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 10 }}>
                {p.priceRp === 0 ? "Gratis" : `Rp${p.priceRp.toLocaleString("id-ID")}`}
                {p.priceRp > 0 && <small style={{ fontSize: "0.68rem", fontWeight: 500 }}> /bulan</small>}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginBottom: 4 }}>
                {p.deviceLimit} perangkat WA
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginBottom: 10 }}>
                {p.monthlyMessageQuota
                  ? `${p.monthlyMessageQuota.toLocaleString("id-ID")} pesan/bulan`
                  : "Kuota pesan tanpa batas"}
              </div>
              <ul style={{ fontSize: "0.75rem", color: "var(--ink-soft)", paddingLeft: 16, marginBottom: 14 }}>
                {p.features.map((f) => (
                  <li key={f}>{FEATURE_LABELS[f] ?? f}</li>
                ))}
                <li style={{ fontWeight: 700, color: "var(--success)" }}>Staf/tim tak terbatas</li>
              </ul>
              {isCurrent ? (
                <span className="badge good">Paket aktif</span>
              ) : (
                <button className="btn" style={{ width: "100%", justifyContent: "center" }} disabled={upgrading === p.id} onClick={() => upgrade(p)}>
                  {upgrading === p.id ? "Memproses…" : "Pilih Paket Ini"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
