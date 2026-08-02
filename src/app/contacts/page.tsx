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
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const activeContact = useMemo(
    () => contacts.find((c) => c.id === activeId) ?? null,
    [contacts, activeId],
  );

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

  const checkTool = (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 10 }}>Cek nomor terdaftar WhatsApp</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          className="field"
          style={{ flex: 1, minWidth: 180 }}
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
  );

  return (
    <div className={`split-shell${activeId ? " open" : ""}`}>
      <div className="split-list">
        <div className="sl-head">
          <div className="sl-title">
            <h2>Kontak</h2>
            <select
              className="field"
              style={{ maxWidth: 150 }}
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
          <div className="sl-search">
            <input
              placeholder="Cari nama atau nomor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="sl-items">
          {loading && (
            <p style={{ textAlign: "center", color: "var(--ink-soft)", padding: "28px 16px", fontSize: "0.85rem" }}>
              Memuat kontak…
            </p>
          )}
          {!loading && filtered.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--ink-soft)", padding: "28px 16px", fontSize: "0.85rem" }}>
              Tidak ada kontak yang cocok.
            </p>
          )}
          {!loading &&
            filtered.slice(0, 200).map((c) => (
              <button
                key={c.id}
                className={`split-row${c.id === activeId ? " active" : ""}`}
                onClick={() => setActiveId(c.id)}
              >
                <div className="avatar-sm">{initials(c.name ?? c.pushname ?? c.id)}</div>
                <div className="sr-body">
                  <div className="sr-title">{c.name ?? c.pushname ?? "Tanpa nama"}</div>
                  <div className="sr-sub mono">{c.number ?? c.id.replace(/@.*/, "")}</div>
                </div>
                {c.isBlocked && (
                  <span className="badge off" style={{ fontSize: "0.6rem" }}>
                    Diblokir
                  </span>
                )}
              </button>
            ))}
          {filtered.length > 200 && (
            <p style={{ fontSize: "0.76rem", color: "var(--ink-soft)", padding: "10px 14px" }}>
              Menampilkan 200 dari {filtered.length} kontak. Persempit pencarian untuk melihat sisanya.
            </p>
          )}
        </div>
      </div>

      <div className="split-detail">
        {!activeContact ? (
          <div className="sd-empty">
            <div className="sd-emoji">👤</div>
            <div>
              <strong style={{ display: "block", color: "var(--ink)", marginBottom: 4 }}>Pilih kontak</strong>
              Pilih kontak di kiri untuk melihat detail, atau cek nomor baru di bawah.
            </div>
            <div style={{ width: "100%", maxWidth: 420, marginTop: 6 }}>{checkTool}</div>
          </div>
        ) : (
          <>
            <div className="sd-head">
              <button className="split-back" onClick={() => setActiveId(null)} aria-label="Kembali">
                ‹
              </button>
              <div className="sd-avatar">{initials(activeContact.name ?? activeContact.pushname ?? activeContact.id)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                  {activeContact.name ?? activeContact.pushname ?? "Tanpa nama"}
                </div>
                <div className="mono" style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>
                  {activeContact.number ?? activeContact.id.replace(/@.*/, "")}
                  {activeContact.id.endsWith("@lid") && (
                    <span
                      className="chip"
                      title="ID privasi WhatsApp — bukan nomor telepon, ditampilkan oleh WhatsApp untuk melindungi nomor asli kontak ini"
                      style={{ fontSize: "0.62rem", padding: "1px 7px", marginLeft: 6 }}
                    >
                      LID
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="sd-inner">
              <div className="card" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Tipe kontak
                    </div>
                    <div style={{ marginTop: 6 }}>
                      {activeContact.isBusiness ? (
                        <span className="badge good">Bisnis</span>
                      ) : activeContact.isMyContact ? (
                        <span className="badge off">Tersimpan</span>
                      ) : (
                        <span className="badge off">Tidak tersimpan</span>
                      )}
                    </div>
                  </div>
                  {activeContact.isBlocked ? (
                    <button
                      className="btn secondary"
                      onClick={() => toggleBlock(activeContact.id, false)}
                      disabled={busy === activeContact.id}
                    >
                      Buka blokir
                    </button>
                  ) : (
                    <button
                      className="btn secondary"
                      style={{ color: "var(--danger)" }}
                      onClick={() => toggleBlock(activeContact.id, true)}
                      disabled={busy === activeContact.id}
                    >
                      Blokir kontak
                    </button>
                  )}
                </div>
              </div>
              {checkTool}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
