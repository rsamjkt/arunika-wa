"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal masuk");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="card login-card" onSubmit={submit}>
        <div className="brand">
          <span className="mark">A</span>
          Arunika · WA
        </div>
        <p className="sub">Masuk untuk mengelola dashboard WhatsApp Gateway Anda.</p>

        <div className="field-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            className="field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </div>

        <div className="field-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <label htmlFor="password">Password</label>
            <a href="/forgot-password" style={{ fontSize: "0.75rem", color: "var(--primary)" }}>
              Lupa password?
            </a>
          </div>
          <input
            id="password"
            type="password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginBottom: 14 }}>{error}</p>
        )}

        <button className="btn" type="submit" disabled={busy || !username || !password} style={{ width: "100%" }}>
          {busy ? "Memproses…" : "Masuk"}
        </button>

        <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: 16, textAlign: "center" }}>
          Belum punya akun?{" "}
          <a href="/register" style={{ color: "var(--primary)" }}>
            Daftar
          </a>
        </p>
      </form>
    </div>
  );
}
