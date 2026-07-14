"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface SessionInfo {
  name: string;
  status: string;
}

interface WAProfile {
  id: string;
  name?: string;
  status?: string;
  pictureUrl?: string | null;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageInner />
    </Suspense>
  );
}

function ProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSession = searchParams.get("session");

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [profile, setProfile] = useState<WAProfile | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data: SessionInfo[]) => {
        setSessions(data);
        if (!activeSession) {
          const working = data.find((s) => s.status === "WORKING");
          if (working) router.replace(`/profile?session=${encodeURIComponent(working.name)}`);
        }
      });
  }, [activeSession, router]);

  const load = useCallback(async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(activeSession)}/profile`);
      if (res.ok) {
        const data: WAProfile = await res.json();
        setProfile(data);
        setName(data.name ?? "");
        setStatus(data.status ?? "");
      } else {
        setProfile(null);
        setName("");
        setStatus("");
        setMessage("Gagal memuat profil perangkat ini.");
      }
    } catch {
      setProfile(null);
      setName("");
      setStatus("");
      setMessage("Gagal memuat profil perangkat ini.");
    } finally {
      setLoading(false);
    }
  }, [activeSession]);

  useEffect(() => {
    setMessage(null);
    load();
  }, [load]);

  async function saveName() {
    if (!activeSession || !name.trim()) return;
    setSavingName(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(activeSession)}/profile/name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal menyimpan nama");
      setMessage("Nama profil berhasil diperbarui.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal menyimpan nama");
    } finally {
      setSavingName(false);
    }
  }

  async function saveStatus() {
    if (!activeSession) return;
    setSavingStatus(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(activeSession)}/profile/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal menyimpan status");
      setMessage("Status berhasil diperbarui.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal menyimpan status");
    } finally {
      setSavingStatus(false);
    }
  }

  if (sessions.length === 0) {
    return <p style={{ color: "var(--ink-soft)" }}>Belum ada perangkat terhubung.</p>;
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <select
          className="field"
          style={{ maxWidth: 220 }}
          value={activeSession ?? ""}
          onChange={(e) => router.push(`/profile?session=${encodeURIComponent(e.target.value)}`)}
        >
          {sessions.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card" style={{ padding: 22 }}>
        {loading ? (
          <p style={{ color: "var(--ink-soft)" }}>Memuat profil…</p>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
              {profile?.pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.pictureUrl}
                  alt="Foto profil"
                  width={56}
                  height={56}
                  style={{ borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div className="avatar-sm" style={{ width: 56, height: 56, fontSize: "1.2rem" }}>
                  {(profile?.name ?? "?")[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700 }}>{profile?.name ?? "—"}</div>
                <div className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
                  {profile?.id?.replace(/@.*/, "")}
                </div>
              </div>
            </div>

            <label style={{ fontSize: "0.78rem", color: "var(--ink-soft)", display: "block", marginBottom: 6 }}>
              Nama tampilan
            </label>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={25} />
              <button className="btn" onClick={saveName} disabled={savingName || !name.trim()}>
                {savingName ? "Menyimpan…" : "Simpan"}
              </button>
            </div>

            <label style={{ fontSize: "0.78rem", color: "var(--ink-soft)", display: "block", marginBottom: 6 }}>
              Status / info
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="field" value={status} onChange={(e) => setStatus(e.target.value)} maxLength={139} />
              <button className="btn" onClick={saveStatus} disabled={savingStatus}>
                {savingStatus ? "Menyimpan…" : "Simpan"}
              </button>
            </div>

            {message && <p style={{ marginTop: 16, fontSize: "0.85rem" }}>{message}</p>}
          </>
        )}
      </div>
    </div>
  );
}
