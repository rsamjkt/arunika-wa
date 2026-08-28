"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import AuthHero from "@/components/AuthHero";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Gagal mengirim email reset");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim email reset");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <AuthHero
        title="Lupa password? Tenang, gampang kok."
        lead="Masukkan email akun Anda, kami kirimkan link aman untuk mengatur ulang password dalam hitungan menit."
      />
      <div className="auth-form-side">
        <div className="auth-card">
          <div className="auth-mark">A</div>
          <h2>Reset password</h2>
          <p className="sub">Masukkan email akun Anda, kami kirimkan link untuk mengatur ulang password.</p>

          {sent ? (
            <div className="callout">
              <b>Email terkirim</b>
              Kalau email tersebut terdaftar, link reset password sudah kami kirim. Cek juga folder spam.
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="field-group">
                <label htmlFor="email">Email</label>
                <div className="in-icon">
                  <Mail size={17} strokeWidth={2} />
                  <input
                    id="email"
                    type="email"
                    className="field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    placeholder="email@bisnis.com"
                  />
                </div>
              </div>
              {error && <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginBottom: 14 }}>{error}</p>}
              <button className="btn" type="submit" disabled={busy || !email} style={{ width: "100%" }}>
                {busy ? "Mengirim…" : "Kirim Link Reset"}
              </button>
            </form>
          )}

          <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: 18, textAlign: "center" }}>
            <a href="/login" style={{ color: "var(--primary)", fontWeight: 700 }}>
              Kembali ke halaman masuk
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
