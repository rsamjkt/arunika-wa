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

function StepHeader({ step }: { step: 1 | 2 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 26 }}>
      <span className={`badge ${step === 1 ? "pending" : "good"}`}>1. Pilih Paket</span>
      <span style={{ width: 24, height: 1, background: "var(--border)" }} />
      <span className={`badge ${step === 2 ? "pending" : "off"}`}>2. Buat Akun</span>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((data: Plan[]) => {
        setPlans(data);
        const free = data.find((p) => p.isFree);
        if (free) setPlanId(free.id);
      });
  }, []);

  const selectedPlan = plans.find((p) => p.id === planId) ?? null;

  function goToAccountStep() {
    if (!planId) {
      setError("Pilih paket terlebih dahulu.");
      return;
    }
    setError(null);
    setStep(2);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          email: email.trim(),
          phone: phone.trim() || undefined,
          planId,
        }),
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
      <div className="card login-card" style={{ width: "100%", maxWidth: step === 1 ? 900 : 420, padding: 36 }}>
        <div className="brand" style={{ justifyContent: "center", marginBottom: 8 }}>
          <span className="mark">A</span>
          Arunika · WA
        </div>
        <StepHeader step={step} />

        {step === 1 && (
          <>
            <p className="sub" style={{ textAlign: "center" }}>
              Pilih paket untuk mulai pakai WhatsApp Gateway Anda sendiri.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
                marginBottom: 24,
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
            {error && (
              <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginBottom: 14, textAlign: "center" }}>
                {error}
              </p>
            )}
            <button className="btn" type="button" disabled={!planId} style={{ width: "100%" }} onClick={goToAccountStep}>
              Lanjut
            </button>
            <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: 16, textAlign: "center" }}>
              Sudah punya akun?{" "}
              <a href="/login" style={{ color: "var(--primary)" }}>
                Masuk
              </a>
            </p>
          </>
        )}

        {step === 2 && (
          <form onSubmit={submit}>
            {selectedPlan && (
              <div
                className="chip"
                style={{ width: "100%", justifyContent: "space-between", marginBottom: 20, padding: "8px 12px" }}
              >
                <span>
                  Paket: <strong>{selectedPlan.name}</strong>{" "}
                  {selectedPlan.priceRp > 0 ? `(Rp${selectedPlan.priceRp.toLocaleString("id-ID")}/bulan)` : "(Gratis)"}
                </span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}
                >
                  Ganti
                </button>
              </div>
            )}
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
            <div className="field-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <p style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginTop: 4 }}>
                Untuk notifikasi pembayaran dan reset password.
              </p>
            </div>
            <div className="field-group">
              <label htmlFor="phone">Nomor HP (opsional)</label>
              <input
                id="phone"
                type="tel"
                className="field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="08xxxxxxxxxx"
              />
            </div>
            {error && <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginBottom: 14 }}>{error}</p>}
            <button
              className="btn"
              type="submit"
              disabled={busy || !planId || username.trim().length < 3 || password.length < 6 || !emailValid}
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
        )}
      </div>
    </div>
  );
}
