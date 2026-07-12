"use client";

import { Suspense, useCallback, useEffect, useState } from "react";

interface SessionInfo {
  name: string;
  status: string;
}
interface WAContact {
  id: string;
  name?: string;
  pushname?: string;
  number?: string;
}
interface MessageTemplate {
  id: string;
  name: string;
  body: string;
}
interface CampaignRecipient {
  chatId: string;
  name?: string;
  status: "pending" | "sent" | "failed";
}
interface Campaign {
  id: string;
  name: string;
  session: string;
  messageBody: string;
  recipients: CampaignRecipient[];
  status: "draft" | "sending" | "completed" | "canceled";
  createdAt: string;
}

export default function BroadcastPage() {
  return (
    <Suspense fallback={null}>
      <BroadcastPageInner />
    </Suspense>
  );
}

function BroadcastPageInner() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [session, setSession] = useState("");
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  const [audienceMode, setAudienceMode] = useState<"contacts" | "manual">("contacts");
  const [contacts, setContacts] = useState<WAContact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualText, setManualText] = useState("");

  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data: SessionInfo[]) => {
        setSessions(data);
        const working = data.find((s) => s.status === "WORKING");
        if (working) setSession(working.name);
      });
    fetch("/api/templates")
      .then((r) => r.json())
      .then(setTemplates);
  }, []);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/sessions/${encodeURIComponent(session)}/contacts?limit=1000`)
      .then((r) => r.json())
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch(() => setContacts([]));
  }, [session]);

  const loadCampaigns = useCallback(async () => {
    const res = await fetch("/api/campaigns");
    if (res.ok) setCampaigns(await res.json());
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    const anySending = campaigns.some((c) => c.status === "sending");
    if (!anySending) return;
    const id = setInterval(loadCampaigns, 3000);
    return () => clearInterval(id);
  }, [campaigns, loadCampaigns]);

  function pickTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) setBody(t.body);
  }

  function insertVar(v: string) {
    setBody((b) => b + v);
  }

  function toggleContact(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredContacts = contacts.filter((c) => {
    const q = contactSearch.toLowerCase();
    if (!q) return true;
    return (c.name || c.pushname || "").toLowerCase().includes(q) || (c.number || c.id).includes(q);
  });

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      filteredContacts.forEach((c) => next.add(c.id));
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function resolveRecipients(): { chatId: string; name?: string }[] {
    if (audienceMode === "contacts") {
      return contacts
        .filter((c) => selected.has(c.id))
        .map((c) => ({ chatId: c.id, name: c.name || c.pushname }));
    }
    return manualText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [phone, ...rest] = line.split(",").map((s) => s.trim());
        const digits = phone.replace(/\D/g, "");
        return { chatId: `${digits}@c.us`, name: rest.join(",") || undefined };
      });
  }

  async function send(startNow: boolean) {
    setMessage(null);
    const recipients = resolveRecipients();
    if (!name.trim() || !session || !body.trim() || recipients.length === 0) {
      setMessage({ ok: false, text: "Lengkapi nama, perangkat, pesan, dan audiens terlebih dahulu." });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          session,
          messageBody: body,
          templateId: templateId || undefined,
          recipients,
          startNow,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat campaign");
      setMessage({
        ok: true,
        text: startNow
          ? `Campaign "${data.name}" mulai dikirim ke ${recipients.length} kontak.`
          : `Campaign "${data.name}" disimpan sebagai draft.`,
      });
      setName("");
      setBody("");
      setTemplateId("");
      setSelected(new Set());
      setManualText("");
      await loadCampaigns();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal mengirim" });
    } finally {
      setSending(false);
    }
  }

  async function startDraft(c: Campaign) {
    setBusy(c.id);
    try {
      await fetch(`/api/campaigns/${c.id}/start`, { method: "POST" });
      await loadCampaigns();
    } finally {
      setBusy(null);
    }
  }

  async function cancel(c: Campaign) {
    if (!confirm(`Batalkan campaign "${c.name}"? Sisa kontak yang belum terkirim tidak akan dikirim.`)) return;
    setBusy(c.id);
    try {
      await fetch(`/api/campaigns/${c.id}/cancel`, { method: "POST" });
      await loadCampaigns();
    } finally {
      setBusy(null);
    }
  }

  function statusBadge(status: Campaign["status"]) {
    const map: Record<Campaign["status"], { cls: string; label: string }> = {
      draft: { cls: "off", label: "Draft" },
      sending: { cls: "pending", label: "Mengirim" },
      completed: { cls: "good", label: "Selesai" },
      canceled: { cls: "bad", label: "Dibatalkan" },
    };
    const s = map[status];
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 480px", minWidth: 320 }}>
          <div className="card cpad mb16" style={{ padding: 22 }}>
            <div className="ch">
              <h2 style={{ fontSize: "1rem" }}>Susun Broadcast</h2>
            </div>

            <label className="lbl">Nama campaign</label>
            <input
              className="field"
              style={{ marginBottom: 14 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Promo Gajian Juli 2026"
            />

            <div className="grid2" style={{ marginBottom: 14 }}>
              <div>
                <label className="lbl">Kirim dari perangkat</label>
                <select className="field" value={session} onChange={(e) => setSession(e.target.value)}>
                  <option value="">Pilih perangkat…</option>
                  {sessions.map((s) => (
                    <option key={s.name} value={s.name} disabled={s.status !== "WORKING"}>
                      {s.name} {s.status !== "WORKING" ? `(${s.status})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lbl">Pakai template (opsional)</label>
                <select className="field" value={templateId} onChange={(e) => pickTemplate(e.target.value)}>
                  <option value="">Tanpa template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="lbl">Isi pesan</label>
            <textarea className="compose" value={body} onChange={(e) => setBody(e.target.value)} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 11 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--ink-soft)", alignSelf: "center" }}>
                Variabel:
              </span>
              <button type="button" className="varchip" onClick={() => insertVar("{nama}")}>
                {"{nama}"}
              </button>
              <button type="button" className="varchip" onClick={() => insertVar("{nomor}")}>
                {"{nomor}"}
              </button>
            </div>
          </div>

          <div className="card cpad" style={{ padding: 22 }}>
            <div className="ch">
              <h2 style={{ fontSize: "1rem" }}>Audiens</h2>
              <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                <button
                  type="button"
                  className={audienceMode === "contacts" ? "btn" : "btn secondary"}
                  onClick={() => setAudienceMode("contacts")}
                >
                  Dari Kontak
                </button>
                <button
                  type="button"
                  className={audienceMode === "manual" ? "btn" : "btn secondary"}
                  onClick={() => setAudienceMode("manual")}
                >
                  Tempel Manual
                </button>
              </div>
            </div>

            {audienceMode === "contacts" ? (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <input
                    className="field"
                    style={{ flex: 1, minWidth: 160 }}
                    placeholder="Cari kontak…"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                  />
                  <button type="button" className="btn secondary" onClick={selectAllFiltered}>
                    Pilih Semua ({filteredContacts.length})
                  </button>
                  <button type="button" className="btn secondary" onClick={clearSelection}>
                    Kosongkan
                  </button>
                </div>
                <div
                  style={{
                    maxHeight: 260,
                    overflowY: "auto",
                    border: "1px solid var(--border)",
                    borderRadius: 11,
                  }}
                >
                  {filteredContacts.map((c) => (
                    <label
                      key={c.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        borderBottom: "1px solid var(--border)",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleContact(c.id)} />
                      <span style={{ fontWeight: 600 }}>{c.name || c.pushname || c.number || c.id}</span>
                      <span className="mono" style={{ color: "var(--ink-soft)", marginLeft: "auto" }}>
                        {c.number || c.id}
                      </span>
                    </label>
                  ))}
                  {filteredContacts.length === 0 && (
                    <p style={{ padding: 16, color: "var(--ink-soft)", fontSize: "0.82rem" }}>Tidak ada kontak.</p>
                  )}
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: 10 }}>
                  {selected.size} kontak dipilih
                </p>
              </>
            ) : (
              <>
                <textarea
                  className="compose"
                  style={{ minHeight: 140 }}
                  placeholder={"628123456789,Budi\n628987654321,Sari\n628111222333"}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                />
                <p style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: 8 }}>
                  Satu nomor per baris. Format: <span className="mono">nomor,nama</span> (nama opsional).
                </p>
              </>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <button className="btn" disabled={sending} onClick={() => send(true)}>
                {sending ? "Mengirim…" : "Kirim Sekarang"}
              </button>
              <button className="btn secondary" disabled={sending} onClick={() => send(false)}>
                Simpan Draft
              </button>
            </div>
            {message && (
              <p style={{ marginTop: 12, fontSize: "0.82rem", color: message.ok ? "var(--success)" : "var(--danger)" }}>
                {message.text}
              </p>
            )}
            <p style={{ fontSize: "0.75rem", color: "var(--ink-soft)", marginTop: 10 }}>
              Pesan dikirim satu per satu dengan jeda acak 4–9 detik untuk menghindari pemblokiran oleh WhatsApp.
            </p>
          </div>
        </div>

        <div style={{ flex: "1 1 320px", minWidth: 300 }}>
          <div className="card cpad" style={{ padding: 18 }}>
            <h2 style={{ fontSize: "0.9rem", marginBottom: 12 }}>Riwayat Campaign</h2>
            {campaigns.map((c) => {
              const total = c.recipients.length;
              const sent = c.recipients.filter((r) => r.status === "sent").length;
              const failed = c.recipients.filter((r) => r.status === "failed").length;
              const pct = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;
              return (
                <div key={c.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                    <strong style={{ fontSize: "0.85rem" }}>{c.name}</strong>
                    {statusBadge(c.status)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                    <div className="progress" style={{ flex: 1 }}>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--ink-soft)", fontWeight: 700 }}>
                      {sent}/{total}
                    </span>
                  </div>
                  {failed > 0 && (
                    <p style={{ fontSize: "0.72rem", color: "var(--danger)", marginBottom: 6 }}>{failed} gagal</p>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    {c.status === "draft" && (
                      <button className="btn secondary" style={{ padding: "5px 10px" }} disabled={busy === c.id} onClick={() => startDraft(c)}>
                        Mulai Kirim
                      </button>
                    )}
                    {c.status === "sending" && (
                      <button className="btn danger" style={{ padding: "5px 10px" }} disabled={busy === c.id} onClick={() => cancel(c)}>
                        Batalkan
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {campaigns.length === 0 && (
              <p style={{ color: "var(--ink-soft)", fontSize: "0.82rem" }}>Belum ada campaign.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
