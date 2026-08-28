"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Lock, Mail, Phone, Ticket, User } from "lucide-react";
import AuthHero from "@/components/AuthHero";

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
  const [step, setStep] = useState<1 | 2>(1);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
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
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setReferralCode(ref.toUpperCase());
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
          referralCode: referralCode.trim() || undefined,
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
    <div className="auth-shell">
      <AuthHero
        title="Mulai gratis dalam 2 menit."
        lead="Pilih paket, buat akun, lalu hubungkan nomor WhatsApp bisnis Anda — semua tanpa kartu kredit."
      />
      <div className="auth-form-side scroll">
        <div className="auth-card wide">
          <div className="auth-mark">A</div>
          <h2>{step === 1 ? "Pilih paket Anda" : "Buat akun"}</h2>
          <p className="sub">
            {step === 1
              ? "Semua paket bisa di-upgrade kapan saja."
              : "Isi data akun untuk menyelesaikan pendaftaran."}
          </p>

          <div className="reg-steps">
            <span className={`reg-pill${step === 1 ? " on" : ""}`}>1. Pilih Paket</span>
            <span style={{ width: 22, height: 1, background: "var(--border)" }} />
            <span className={`reg-pill${step === 2 ? " on" : ""}`}>2. Buat Akun</span>
          </div>

          {step === 1 && (
            <>
              <p className="reg-note">
                Semua paket dapat <strong>semua fitur</strong> + staf/tim tak terbatas — bedanya hanya jumlah perangkat &amp; kuota pesan.
              </p>
              <div className="reg-plan-list">
                {plans.map((p) => {
                  const selected = planId === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setPlanId(p.id)}
                      className={`reg-plan${selected ? " sel" : ""}`}
                    >
                      <span className="pl-check">{selected && <Check size={12} strokeWidth={3} />}</span>
                      <span className="pl-l">
                        <span className="pl-name">{p.name}</span>
                        <span className="pl-meta">
                          {p.deviceLimit} perangkat ·{" "}
                          {p.monthlyMessageQuota
                            ? `${p.monthlyMessageQuota.toLocaleString("id-ID")} pesan/bln`
                            : "kuota tanpa batas"}
                        </span>
                      </span>
                      <span className="pl-price">
                        {p.priceRp === 0 ? "Gratis" : `Rp${p.priceRp.toLocaleString("id-ID")}`}
                        {p.priceRp > 0 && <small> /bln</small>}
                      </span>
                    </button>
                  );
                })}
                {plans.length === 0 && (
                  <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>Memuat paket…</p>
                )}
              </div>
              {error && (
                <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginBottom: 14 }}>{error}</p>
              )}
              <button className="btn" type="button" disabled={!planId} style={{ width: "100%" }} onClick={goToAccountStep}>
                Lanjut
                <ArrowRight size={17} />
              </button>
              <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: 18, textAlign: "center" }}>
                Sudah punya akun?{" "}
                <a href="/login" style={{ color: "var(--primary)", fontWeight: 700 }}>
                  Masuk
                </a>
              </p>
            </>
          )}

          {step === 2 && (
            <form onSubmit={submit}>
              {selectedPlan && (
                <div className="chip" style={{ width: "100%", justifyContent: "space-between", marginBottom: 20, padding: "8px 12px" }}>
                  <span>
                    Paket: <strong>{selectedPlan.name}</strong>{" "}
                    {selectedPlan.priceRp > 0 ? `(Rp${selectedPlan.priceRp.toLocaleString("id-ID")}/bln)` : "(Gratis)"}
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
                <div className="in-icon">
                  <User size={17} strokeWidth={2} />
                  <input id="username" className="field" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus placeholder="pilih username" />
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="password">Password</label>
                <div className="in-icon">
                  <Lock size={17} strokeWidth={2} />
                  <input id="password" type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="min. 6 karakter" />
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="email">Email</label>
                <div className="in-icon">
                  <Mail size={17} strokeWidth={2} />
                  <input id="email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="email@bisnis.com" />
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginTop: 4 }}>
                  Untuk notifikasi pembayaran dan reset password.
                </p>
              </div>
              <div className="field-group">
                <label htmlFor="phone">Nomor HP (opsional)</label>
                <div className="in-icon">
                  <Phone size={17} strokeWidth={2} />
                  <input id="phone" type="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="08xxxxxxxxxx" />
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="referralCode">Kode referral (opsional)</label>
                <div className="in-icon">
                  <Ticket size={17} strokeWidth={2} />
                  <input id="referralCode" className="field mono" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} placeholder="mis. A1B2C3D4" />
                </div>
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
              <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: 18, textAlign: "center" }}>
                Sudah punya akun?{" "}
                <a href="/login" style={{ color: "var(--primary)", fontWeight: 700 }}>
                  Masuk
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
