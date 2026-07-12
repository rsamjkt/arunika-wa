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
      <div className="card login-card" style={{ width: "100%", maxWidth: 900, padding: 36 }}>
        <div className="brand" style={{ justifyContent: "center", marginBottom: 8 }}>
          <span className="mark">A</span>
          Arunika · WA
        </div>
        <p className="sub" style={{ textAlign: "center" }}>
          Daftar dan pilih paket untuk mulai pakai WhatsApp Gateway Anda sendiri.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            marginBottom: 28,
          }}
        >
          {plans.map((p) => {
            const selected = planId === p.id;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setPlanId(p.id)}
                className="card"
                style={{
                  textAlign: "left",
                  padding: 18,
                  cursor: "pointer",
                  background: selected ? "var(--success-bg)" : "var(--surface)",
                  border: selected ? "2px solid var(--primary)" : "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>{p.name}</span>
                  {selected && <span className="badge good">Dipilih</span>}
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 10 }}>
                  {p.priceRp === 0 ? "Gratis" : `Rp${p.priceRp.toLocaleString("id-ID")}`}
                  {p.priceRp > 0 && <small style={{ fontSize: "0.68rem", fontWeight: 500 }}> /bulan</small>}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginBottom: 4 }}>
                  {p.deviceLimit} perangkat WA
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginBottom: p.features.length ? 10 : 0 }}>
                  {p.monthlyMessageQuota ? `${p.monthlyMessageQuota} pesan/bulan` : "Kuota pesan tanpa batas"}
                </div>
                {p.features.length > 0 && (
                  <ul style={{ fontSize: "0.75rem", color: "var(--ink-soft)", paddingLeft: 16, margin: 0 }}>
                    {p.features.map((f) => (
                      <li key={f}>{FEATURE_LABELS[f] ?? f}</li>
                    ))}
                  </ul>
                )}
              </button>
            );
          })}
          {plans.length === 0 && (
            <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>Memuat paket…</p>
          )}
        </div>

        <form onSubmit={submit} style={{ maxWidth: 380, margin: "0 auto" }}>
          <div className="field-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className="field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
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
            disabled={busy || !planId || username.trim().length < 3 || password.length < 6}
            style={{ width: "100%" }}
          >
            {busy ? "Memproses…" : "Daftar"}
          </button>
          <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: 16, textAlign: "center" }}>
            Sudah punya akun?{" "}
            <a href="/login" style={{ color: "var(--primary)" }}>
              Masuk
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
