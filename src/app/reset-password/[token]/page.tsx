"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import AuthHero from "@/components/AuthHero";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengatur ulang password");
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengatur ulang password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <AuthHero
        title="Hampir selesai — atur password baru Anda."
        lead="Pilih password yang kuat dan mudah Anda ingat. Semua sesi login lama otomatis diputus setelah ini."
      />
      <div className="auth-form-side">
        <div className="card login-card">
          <div className="brand">
            <span className="mark">A</span>
            Arunika · WA
          </div>
          <p className="sub">Atur password baru untuk akun Anda.</p>

          {done ? (
            <div className="callout">
              <b>Password berhasil diubah</b>
              Mengarahkan ke halaman masuk…
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="field-group">
                <label htmlFor="password">Password baru</label>
                <input
                  id="password"
                  type="password"
                  className="field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div className="field-group">
                <label htmlFor="confirm">Ulangi password baru</label>
                <input
                  id="confirm"
                  type="password"
                  className="field"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {error && <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginBottom: 14 }}>{error}</p>}
              <button
                className="btn"
                type="submit"
                disabled={busy || password.length < 6 || !confirm}
                style={{ width: "100%" }}
              >
                {busy ? "Menyimpan…" : "Simpan Password Baru"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
