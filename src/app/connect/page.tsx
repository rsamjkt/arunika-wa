"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SessionStatus =
  | "STOPPED"
  | "STARTING"
  | "SCAN_QR_CODE"
  | "WORKING"
  | "FAILED";

export default function ConnectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [session, setSession] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrBroken, setQrBroken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (qrRef.current) clearInterval(qrRef.current);
  }, []);

  useEffect(() => stopTimers, [stopTimers]);

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat perangkat");
      setSession(data.name);
      setStatus(data.status);
      beginPolling(data.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat perangkat");
    } finally {
      setBusy(false);
    }
  }

  function beginPolling(sessionName: string) {
    stopTimers();
    refreshQr(sessionName);
    qrRef.current = setInterval(() => refreshQr(sessionName), 20_000);
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionName)}`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.status);
      if (data.status === "WORKING") {
        stopTimers();
        setTimeout(() => {
          router.push(`/inbox?session=${encodeURIComponent(sessionName)}`);
        }, 900);
      }
    }, 2500);
  }

  function refreshQr(sessionName: string) {
    setQrBroken(false);
    setQrUrl(`/api/sessions/${encodeURIComponent(sessionName)}/qr?t=${Date.now()}`);
  }

  async function retry() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(session)}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal memulai ulang perangkat");
      setStatus(data.status);
      beginPolling(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memulai ulang perangkat");
    } finally {
      setBusy(false);
    }
  }

  const step = !session ? 1 : status === "WORKING" ? 3 : 2;

  return (
    <div className="card onboard-card">
      {!session ? (
        <>
          <h2>Tambah perangkat baru</h2>
          <p className="sub">
            Beri nama, mis. &quot;Toko Utama&quot; atau &quot;Customer Service&quot; — nama ini
            akan tampil di daftar perangkat dan Inbox.
          </p>
          <form
            onSubmit={createSession}
            style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}
          >
            <input
              className="field"
              placeholder="Nama perangkat, mis. Toko Utama"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoFocus
            />
            <button className="btn" type="submit" disabled={busy || !name.trim()}>
              {busy ? "Membuat…" : "Buat & pindai QR"}
            </button>
          </form>
        </>
      ) : status === "FAILED" ? (
        <>
          <h2>Gagal menyambungkan</h2>
          <p className="sub">Perangkat &quot;{session}&quot; gagal dimulai. Coba lagi.</p>
          <button className="btn" onClick={retry} disabled={busy}>
            {busy ? "Mencoba…" : "Coba lagi"}
          </button>
        </>
      ) : status === "WORKING" ? (
        <>
          <h2>Tersambung 🎉</h2>
          <p className="sub">
            Nomor untuk perangkat &quot;{session}&quot; berhasil dipasangkan. Mengalihkan ke
            Inbox…
          </p>
        </>
      ) : (
        <>
          <h2>Pindai kode QR</h2>
          <p className="sub">
            Buka WhatsApp di HP → Pengaturan → Perangkat Tertaut → Tautkan Perangkat
          </p>
          <div className="qr-frame">
            {qrUrl && !qrBroken ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrUrl} alt="Kode QR WhatsApp" onError={() => setQrBroken(true)} />
            ) : (
              <span className="placeholder">Memuat QR…</span>
            )}
          </div>
          <p className="sub" style={{ fontSize: "0.76rem" }}>
            Kode diperbarui otomatis setiap 20 detik selama menunggu.
          </p>
        </>
      )}

      {error && (
        <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginTop: 14 }}>{error}</p>
      )}

      <div className="step-track" aria-label={`Langkah ${step} dari 3`}>
        <span className={`dot${step > 1 ? " done" : step === 1 ? " active" : ""}`} />
        <span className={`dot${step > 2 ? " done" : step === 2 ? " active" : ""}`} />
        <span className={`dot${step === 3 ? " active" : ""}`} />
      </div>
    </div>
  );
}
