"use client";

import { Fragment, Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  }, [load]);

  async function openGroup(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>
          Grup WhatsApp yang diikuti oleh perangkat ini.
        </p>
        <select
          className="field"
          style={{ maxWidth: 220 }}
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

      <div className="table-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>Grup</th>
              <th>Anggota</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", color: "var(--ink-soft)", padding: "28px 16px" }}>
                  Memuat grup…
                </td>
              </tr>
            )}
            {!loading && groups.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", color: "var(--ink-soft)", padding: "28px 16px" }}>
                  Belum tergabung di grup mana pun.
                </td>
              </tr>
            )}
            {!loading &&
              groups.map((g) => (
                <Fragment key={g.id}>
                  <tr>
                    <td>
                      <button
                        onClick={() => openGroup(g.id)}
                        style={{ background: "none", border: "none", padding: 0, textAlign: "left", color: "inherit" }}
                      >
                        <strong style={{ fontSize: "0.86rem" }}>{g.name ?? g.subject ?? g.id}</strong>
                      </button>
                    </td>
                    <td className="mono" style={{ color: "var(--ink-soft)" }}>
                      {g.participants?.length ?? "—"}
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn secondary" onClick={() => openGroup(g.id)}>
                          {openId === g.id ? "Tutup" : "Lihat anggota"}
                        </button>
                        <button className="btn danger" onClick={() => leave(g.id)} disabled={busy}>
                          Keluar
                        </button>
                      </div>
                    </td>
                  </tr>
                  {openId === g.id && (
                    <tr>
                      <td colSpan={3} style={{ background: "var(--bg)" }}>
                        {participantsLoading ? (
                          <span style={{ color: "var(--ink-soft)", fontSize: "0.82rem" }}>Memuat anggota…</span>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "6px 0" }}>
                            {participants.map((p) => (
                              <span key={p.id} className="badge off mono">
                                {p.id.replace(/@.*/, "")}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
