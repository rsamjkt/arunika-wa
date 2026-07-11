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

export default function RegisterPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((data: Plan[]) => {
        setPlans(data);
        const free = data.find((p) => p.isFree);
        if (free) setPlanId(free.id);
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!planId) {
      setError("Pilih paket terlebih dahulu.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mendaftar");
      if (data.requiresPayment) {
        router.push(`/register/pay/${data.orderId}`);
      } else {
        router.push("/login?registered=1");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mendaftar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="card" style={{ width: "100%", maxWidth: 860, padding: 32 }}>
        <div className="brand" style={{ marginBottom: 6 }}>
          <span className="mark">A</span>
          Arunika · WA
        </div>
        <p className="sub">Daftar dan pilih paket untuk mulai pakai WhatsApp Gateway Anda sendiri.</p>

        <div
          className="grid3"
          style={{ gridTemplateColumns: `repeat(${Math.min(plans.length || 1, 3)}, 1fr)`, marginBottom: 24 }}
        >
          {plans.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setPlanId(p.id)}
              className="card"
              style={{
                textAlign: "left",
                padding: 18,
                cursor: "pointer",
                border: planId === p.id ? "2px solid var(--primary)" : "1px solid var(--border)",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 10 }}>
                {p.priceRp === 0 ? "Gratis" : `Rp${p.priceRp.toLocaleString("id-ID")}`}
                {p.priceRp > 0 && <small style={{ fontSize: "0.7rem", fontWeight: 500 }}> /bulan</small>}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginBottom: 4 }}>
                {p.deviceLimit} perangkat WA
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginBottom: 10 }}>
                {p.monthlyMessageQuota ? `${p.monthlyMessageQuota} pesan/bulan` : "Kuota pesan tanpa batas"}
              </div>
              {p.features.length > 0 && (
                <ul style={{ fontSize: "0.76rem", color: "var(--ink-soft)", paddingLeft: 16, margin: 0 }}>
                  {p.features.map((f) => (
                    <li key={f}>{FEATURE_LABELS[f] ?? f}</li>
                  ))}
                </ul>
              )}
            </button>
          ))}
        </div>

        <form onSubmit={submit} style={{ maxWidth: 380 }}>
          <div className="field-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className="field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="field-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginBottom: 14 }}>{error}</p>}
          <button
            className="btn"
            type="submit"
            disabled={busy || username.trim().length < 3 || password.length < 6}
            style={{ width: "100%" }}
          >
            {busy ? "Memproses…" : "Daftar"}
          </button>
        </form>
        <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: 16 }}>
          Sudah punya akun?{" "}
          <a href="/login" style={{ color: "var(--primary)" }}>
            Masuk
          </a>
        </p>
      </div>
    </div>
  );
}
