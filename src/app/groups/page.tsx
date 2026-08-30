"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Users } from "lucide-react";

interface SessionInfo {
  name: string;
  status: string;
}

interface Participant {
  id: string;
}

interface WAGroup {
  id: string;
  name?: string;
  subject?: string;
  participants?: Participant[];
}

function initials(text: string) {
  return (
    text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "#"
  );
}

export default function GroupsPage() {
  return (
    <Suspense fallback={null}>
      <GroupsPageInner />
    </Suspense>
  );
}

function GroupsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSession = searchParams.get("session");

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [groups, setGroups] = useState<WAGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data: SessionInfo[]) => {
        setSessions(data);
        if (!activeSession) {
          const working = data.find((s) => s.status === "WORKING");
          if (working) router.replace(`/groups?session=${encodeURIComponent(working.name)}`);
        }
      });
  }, [activeSession, router]);

  const load = useCallback(async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(activeSession)}/groups`);
      if (res.ok) setGroups(await res.json());
    } finally {
      setLoading(false);
    }
  }, [activeSession]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  const activeGroup = useMemo(() => groups.find((g) => g.id === openId) ?? null, [groups, openId]);

  async function openGroup(id: string) {
    setOpenId(id);
    setParticipants([]);
    setParticipantsLoading(true);
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(activeSession!)}/groups/${encodeURIComponent(id)}/participants`,
      );
      if (res.ok) setParticipants(await res.json());
    } finally {
      setParticipantsLoading(false);
    }
  }

  async function leave(id: string) {
    if (!activeSession) return;
    if (!confirm("Keluar dari grup ini?")) return;
    setBusy(true);
    try {
      await fetch(`/api/sessions/${encodeURIComponent(activeSession)}/groups/${encodeURIComponent(id)}/leave`, {
        method: "POST",
      });
      setOpenId(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (sessions.length === 0) {
    return <p style={{ color: "var(--ink-soft)" }}>Belum ada perangkat terhubung.</p>;
  }

  return (
    <div className={`split-shell${openId ? " open" : ""}`}>
      <div className="split-list">
        <div className="sl-head">
          <div className="sl-title">
            <h2>Grup</h2>
            <select
              className="field"
              style={{ maxWidth: 150 }}
              value={activeSession ?? ""}
              onChange={(e) => router.push(`/groups?session=${encodeURIComponent(e.target.value)}`)}
            >
              {sessions.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="sl-items">
          {loading && (
            <p style={{ textAlign: "center", color: "var(--ink-soft)", padding: "28px 16px", fontSize: "0.85rem" }}>
              Memuat grup…
            </p>
          )}
          {!loading && groups.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--ink-soft)", padding: "28px 16px", fontSize: "0.85rem" }}>
              Belum tergabung di grup mana pun.
            </p>
          )}
          {!loading &&
            groups.map((g) => (
              <button
                key={g.id}
                className={`split-row${openId === g.id ? " active" : ""}`}
                onClick={() => openGroup(g.id)}
              >
                <div className="avatar-sm">{initials(g.name ?? g.subject ?? "#")}</div>
                <div className="sr-body">
                  <div className="sr-title">{g.name ?? g.subject ?? g.id}</div>
                  <div className="sr-sub">{g.participants?.length ?? "—"} anggota</div>
                </div>
              </button>
            ))}
        </div>
      </div>

      <div className="split-detail">
        {!activeGroup ? (
          <div className="sd-empty">
            <div className="sd-emoji"><Users size={40} strokeWidth={2} /></div>
            <div>
              <strong style={{ display: "block", color: "var(--ink)", marginBottom: 4 }}>Pilih grup</strong>
              Pilih grup di kiri untuk melihat daftar anggotanya.
            </div>
          </div>
        ) : (
          <>
            <div className="sd-head">
              <button className="split-back" onClick={() => setOpenId(null)} aria-label="Kembali">
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
              <div className="sd-avatar">{initials(activeGroup.name ?? activeGroup.subject ?? "#")}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                  {activeGroup.name ?? activeGroup.subject ?? activeGroup.id}
                </div>
                <div style={{ color: "var(--ink-soft)", fontSize: "0.82rem" }}>
                  {activeGroup.participants?.length ?? participants.length} anggota
                </div>
              </div>
              <button className="btn danger" onClick={() => leave(activeGroup.id)} disabled={busy}>
                Keluar
              </button>
            </div>
            <div className="sd-inner">
              <div className="card cpad" style={{ padding: 18 }}>
                <div style={{ fontSize: "0.72rem", color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
                  Anggota
                </div>
                {participantsLoading ? (
                  <span style={{ color: "var(--ink-soft)", fontSize: "0.82rem" }}>Memuat anggota…</span>
                ) : participants.length === 0 ? (
                  <span style={{ color: "var(--ink-soft)", fontSize: "0.82rem" }}>Tidak ada data anggota.</span>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {participants.map((p) => (
                      <span key={p.id} className="badge off mono">
                        {p.id.replace(/@.*/, "")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
