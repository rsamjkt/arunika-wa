"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface SessionInfo {
  name: string;
  status: string;
}

interface WAContact {
  id: string;
  name?: string;
  pushname?: string;
  number?: string;
  isMyContact?: boolean;
  isBusiness?: boolean;
  isBlocked?: boolean;
}

function initials(text: string) {
  return (
    text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={null}>
      <ContactsPageInner />
    </Suspense>
  );
}

function ContactsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSession = searchParams.get("session");

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [contacts, setContacts] = useState<WAContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const [checkPhone, setCheckPhone] = useState("");
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data: SessionInfo[]) => {
        setSessions(data);
        if (!activeSession) {
          const working = data.find((s) => s.status === "WORKING");
          if (working) router.replace(`/contacts?session=${encodeURIComponent(working.name)}`);
        }
      })
      .catch(() => {})
      .finally(() => setSessionsLoaded(true));
  }, [activeSession, router]);

  const load = useCallback(async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(activeSession)}/contacts?limit=200`);
      if (res.ok) setContacts(await res.json());
    } finally {
      setLoading(false);
    }
  }, [activeSession]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = (c.name ?? c.pushname ?? "").toLowerCase();
      const number = (c.number ?? c.id).toLowerCase();
      return name.includes(q) || number.includes(q);
    });
  }, [contacts, search]);

  async function toggleBlock(contactId: string, block: boolean) {
    if (!activeSession) return;
    setBusy(contactId);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(activeSession)}/contacts/${block ? "block" : "unblock"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (res.ok) {
        setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, isBlocked: block } : c)));
      }
    } finally {
      setBusy(null);
    }
  }

  async function runCheck() {
    if (!activeSession || !checkPhone.trim()) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(activeSession)}/contacts/check?phone=${encodeURIComponent(checkPhone.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengecek nomor");
      setCheckResult(
        data.numberExists
          ? `✅ Terdaftar di WhatsApp — chatId: ${data.chatId}`
          : "❌ Nomor ini tidak terdaftar di WhatsApp",
      );
    } catch (err) {
      setCheckResult(err instanceof Error ? err.message : "Gagal mengecek nomor");
    } finally {
      setChecking(false);
    }
  }

  if (!sessionsLoaded) {
    return <p style={{ color: "var(--ink-soft)" }}>Memuat…</p>;
  }
  if (sessions.length === 0) {
    return <p style={{ color: "var(--ink-soft)" }}>Belum ada perangkat terhubung.</p>;
  }

  return (
    <div>
      <div className="card cpad" style={{ padding: 18, marginBottom: 18 }}>
        <div className="ch">
          <div className="chttl">Cek nomor terdaftar WhatsApp</div>
          <select
            className="field"
            style={{ maxWidth: 220, marginLeft: "auto" }}
            value={activeSession ?? ""}
            onChange={(e) => router.push(`/contacts?session=${encodeURIComponent(e.target.value)}`)}
          >
            {sessions.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            className="field"
            style={{ flex: 1, minWidth: 200 }}
            placeholder="mis. 6281234567890"
            value={checkPhone}
            onChange={(e) => setCheckPhone(e.target.value)}
          />
          <button className="btn secondary" onClick={runCheck} disabled={checking || !checkPhone.trim()}>
            {checking ? "Mengecek…" : "Cek nomor"}
          </button>
        </div>
        {checkResult && <p style={{ marginTop: 10, fontSize: "0.85rem" }}>{checkResult}</p>}
      </div>

      <input
        className="field"
        placeholder="Cari kontak berdasarkan nama/nomor…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 14, maxWidth: 360 }}
      />

      <div className="table-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>Kontak</th>
              <th>Nomor</th>
              <th>Tipe</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--ink-soft)", padding: "28px 16px" }}>
                  Tidak ada kontak yang cocok.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--ink-soft)", padding: "28px 16px" }}>
                  Memuat kontak…
                </td>
              </tr>
            )}
            {!loading &&
              filtered.slice(0, 100).map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="avatar-sm">{initials(c.name ?? c.pushname ?? c.id)}</div>
                      <strong style={{ fontSize: "0.86rem" }}>{c.name ?? c.pushname ?? "Tanpa nama"}</strong>
                    </div>
                  </td>
                  <td className="mono" style={{ color: "var(--ink-soft)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {c.number ?? c.id.replace(/@.*/, "")}
                      {c.id.endsWith("@lid") && (
                        <span
                          className="chip"
                          title="ID privasi WhatsApp — bukan nomor telepon, ditampilkan oleh WhatsApp untuk melindungi nomor asli kontak ini"
                          style={{ fontSize: "0.62rem", padding: "1px 7px" }}
                        >
                          LID
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {c.isBusiness ? (
                      <span className="badge good">Bisnis</span>
                    ) : c.isMyContact ? (
                      <span className="badge off">Tersimpan</span>
                    ) : (
                      <span className="badge off">Tidak tersimpan</span>
                    )}
                  </td>
                  <td>
                    <div className="actions-cell">
                      {c.isBlocked ? (
                        <button
                          className="btn secondary"
                          onClick={() => toggleBlock(c.id, false)}
                          disabled={busy === c.id}
                        >
                          Buka blokir
                        </button>
                      ) : (
                        <button
                          className="btn secondary"
                          style={{ color: "var(--danger)" }}
                          onClick={() => toggleBlock(c.id, true)}
                          disabled={busy === c.id}
                        >
                          Blokir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {filtered.length > 100 && (
        <p style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: 10 }}>
          Menampilkan 100 dari {filtered.length} kontak yang cocok. Persempit pencarian untuk melihat sisanya.
        </p>
      )}
    </div>
  );
}
