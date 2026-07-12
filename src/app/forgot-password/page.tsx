"use client";

import { useState } from "react";
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
        <div className="card login-card">
          <div className="brand">
            <span className="mark">A</span>
            Arunika · WA
          </div>
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
                <input
                  id="email"
                  type="email"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {error && <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginBottom: 14 }}>{error}</p>}
              <button
                className="btn"
                type="submit"
                disabled={busy || !email}
                style={{ width: "100%", background: "#0f172a", color: "#fff", boxShadow: "none" }}
              >
                {busy ? "Mengirim…" : "Kirim Link Reset"}
              </button>
            </form>
          )}

          <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: 16, textAlign: "center" }}>
            <a href="/login" style={{ color: "#0f172a", fontWeight: 700 }}>
              Kembali ke halaman masuk
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
