"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { substituteVariables } from "@/lib/textVars";

type SessionStatus =
  | "STOPPED"
  | "STARTING"
  | "SCAN_QR_CODE"
  | "WORKING"
  | "FAILED";

interface SessionInfo {
  name: string;
  status: SessionStatus;
}

interface ChatSummary {
  id: string;
  name: string | null;
  picture: string | null;
  lastMessage: { body?: string; timestamp?: number; fromMe?: boolean } | null;
}

interface WAMediaInfo {
  url: string;
  filename?: string | null;
  mimetype: string;
  error?: string;
}

interface WAMessage {
  id: string;
  timestamp: number;
  fromMe: boolean;
  body: string;
  hasMedia?: boolean;
  media?: WAMediaInfo | null;
}

interface TeamMember {
  id: string;
  username: string;
}

interface Assignment {
  assignedTo: string | null;
  status: "open" | "resolved";
}

interface MessageTemplate {
  id: string;
  name: string;
  body: string;
}

const UNASSIGNED: Assignment = { assignedTo: null, status: "open" };

function initials(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";
}

function label(status: SessionStatus) {
  return (
    {
      WORKING: "Terhubung",
      SCAN_QR_CODE: "Menunggu scan",
      STARTING: "Memulai",
      FAILED: "Gagal",
      STOPPED: "Terputus",
    } as Record<SessionStatus, string>
  )[status];
}

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function MediaContent({ media }: { media: WAMediaInfo }) {
  if (media.error) {
    return <div className="media-fallback">Media gagal dimuat</div>;
  }
  if (media.mimetype.startsWith("image/")) {
    return (
      <a href={media.url} target="_blank" rel="noopener noreferrer">
        <img src={media.url} alt="Gambar" className="bub-media" loading="lazy" />
      </a>
    );
  }
  if (media.mimetype.startsWith("video/")) {
    return <video src={media.url} controls className="bub-media" />;
  }
  if (media.mimetype.startsWith("audio/")) {
    return <audio src={media.url} controls className="bub-audio" />;
  }
  return (
    <a href={media.url} target="_blank" rel="noopener noreferrer" className="media-fallback">
      📄 {media.filename || "Dokumen"} — buka/unduh
    </a>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxPageInner />
    </Suspense>
  );
}

function InboxPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSession = searchParams.get("session");

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "mine" | "unassigned" | "resolved">("all");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; preview: string } | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteTags, setNoteTags] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const msgsEndRef = useRef<HTMLDivElement | null>(null);
  const msgsBoxRef = useRef<HTMLDivElement | null>(null);
  const lastMsgIdRef = useRef<string | null>(null);
  const forceScrollRef = useRef(true);
  const typingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenForChat = useRef<string | null>(null);

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/sessions");
    if (!res.ok) return;
    const data: SessionInfo[] = await res.json();
    setSessions(data);
    if (!activeSession) {
      const working = data.find((s) => s.status === "WORKING");
      if (working) {
        router.replace(`/inbox?session=${encodeURIComponent(working.name)}`);
      }
    }
  }, [activeSession, router]);

  useEffect(() => {
    loadSessions();
    const id = setInterval(loadSessions, 10_000);
    return () => clearInterval(id);
  }, [loadSessions]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => setMyUserId(me?.id ?? null))
      .catch(() => {});
    fetch("/api/templates")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTemplates)
      .catch(() => {});
  }, []);

  const chatsInFlight = useRef(false);

  const loadChats = useCallback(async () => {
    if (!activeSession || chatsInFlight.current) return;
    chatsInFlight.current = true;
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(activeSession)}/chats`);
      if (res.ok) setChats(await res.json());
    } finally {
      chatsInFlight.current = false;
      setChatsLoading(false);
    }
  }, [activeSession]);

  const loadAssignments = useCallback(async () => {
    if (!activeSession) return;
    const res = await fetch(`/api/inbox/assignment?session=${encodeURIComponent(activeSession)}`);
    if (res.ok) {
      const data = await res.json();
      setAssignments(data.assignments ?? {});
      setTeamMembers(data.teamMembers ?? []);
    }
  }, [activeSession]);

  async function updateAssignment(chatId: string, patch: Partial<Assignment>) {
    if (!activeSession) return;
    setAssignments((prev) => ({ ...prev, [chatId]: { ...(prev[chatId] ?? UNASSIGNED), ...patch } }));
    await fetch("/api/inbox/assignment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: activeSession, chatId, ...patch }),
    });
  }

  useEffect(() => {
    setActiveChatId(null);
    setMessages([]);
    setChats([]);
    setSearch("");
    setFilterMode("all");
    if (!activeSession) return;
    setChatsLoading(true);
    loadChats();
    loadAssignments();
    const id = setInterval(() => {
      loadChats();
      loadAssignments();
    }, 8_000);
    return () => clearInterval(id);
  }, [activeSession, loadChats, loadAssignments]);

  const messagesInFlight = useRef(false);

  const loadMessages = useCallback(async () => {
    if (!activeSession || !activeChatId || messagesInFlight.current) return;
    messagesInFlight.current = true;
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(activeSession)}/messages?chatId=${encodeURIComponent(activeChatId)}`,
      );
      if (res.ok) {
        const data: WAMessage[] = await res.json();
        setMessages([...data].reverse());
      }
    } finally {
      messagesInFlight.current = false;
      setMessagesLoading(false);
    }
  }, [activeSession, activeChatId]);

  useEffect(() => {
    setMessagesLoading(true);
    setReplyTo(null);
    setMessages([]);
    lastMsgIdRef.current = null;
    forceScrollRef.current = true;
    if (!activeChatId) return;
    loadMessages();
    const id = setInterval(loadMessages, 4_000);
    return () => clearInterval(id);
  }, [activeChatId, loadMessages]);

  // Auto-scroll only when a genuinely new message just arrived (or the chat
  // was just opened) and the user isn't mid-scroll reading older history —
  // polling every 4s used to force-scroll on every single poll regardless,
  // which yanked the view back to the bottom while scrolling up.
  useEffect(() => {
    // The chat-switch effect clears messages to [] first, before the real
    // fetch resolves — skip that transient empty render entirely so it
    // can't consume forceScrollRef before the actual messages arrive.
    if (messages.length === 0) return;

    const latest = messages[messages.length - 1];
    const isNewMessage = !!latest && latest.id !== lastMsgIdRef.current;
    lastMsgIdRef.current = latest?.id ?? lastMsgIdRef.current;

    const box = msgsBoxRef.current;
    const nearBottom = !box || box.scrollHeight - box.scrollTop - box.clientHeight < 150;

    if (forceScrollRef.current || (isNewMessage && nearBottom)) {
      // Deferred: calling scrollIntoView synchronously inside this effect is
      // unreliable here (observed no-op in production even though layout
      // numbers already look final) — a macrotask delay lets it settle.
      setTimeout(() => msgsEndRef.current?.scrollIntoView({ block: "end" }), 50);
      forceScrollRef.current = false;
    }
  }, [messages]);

  useEffect(() => {
    setShowNotes(false);
    setNoteTags("");
    setNoteText("");
    setNoteSaved(true);
    if (!activeSession || !activeChatId) return;
    fetch(
      `/api/inbox/contact-note?session=${encodeURIComponent(activeSession)}&contactId=${encodeURIComponent(activeChatId)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setNoteTags((data.tags ?? []).join(", "));
        setNoteText(data.note ?? "");
      })
      .catch(() => {});
  }, [activeSession, activeChatId]);

  async function saveNote() {
    if (!activeSession || !activeChatId) return;
    await fetch("/api/inbox/contact-note", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: activeSession,
        contactId: activeChatId,
        tags: noteTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        note: noteText,
      }),
    });
    setNoteSaved(true);
  }

  useEffect(() => {
    if (!activeSession || !activeChatId) return;
    if (seenForChat.current === activeChatId) return;
    seenForChat.current = activeChatId;
    fetch("/api/message-seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: activeSession, chatId: activeChatId }),
    }).catch(() => {});
  }, [activeSession, activeChatId]);

  function notifyTyping() {
    if (!activeSession || !activeChatId) return;
    if (!typingRef.current) {
      typingRef.current = true;
      fetch("/api/message-typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: activeSession, chatId: activeChatId, state: "start" }),
      }).catch(() => {});
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingRef.current = false;
      fetch("/api/message-typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: activeSession, chatId: activeChatId, state: "stop" }),
      }).catch(() => {});
    }, 3000);
  }

  async function reactTo(messageId: string, reaction: string) {
    if (!activeSession) return;
    setActingOn(messageId);
    try {
      await fetch("/api/message-reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: activeSession, messageId, reaction }),
      });
    } finally {
      setActingOn(null);
    }
  }

  async function starIt(messageId: string, star: boolean) {
    if (!activeSession || !activeChatId) return;
    setActingOn(messageId);
    try {
      await fetch("/api/message-star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: activeSession, chatId: activeChatId, messageId, star }),
      });
    } finally {
      setActingOn(null);
    }
  }

  async function deleteIt(messageId: string) {
    if (!activeSession || !activeChatId) return;
    if (!confirm("Hapus pesan ini?")) return;
    setActingOn(messageId);
    try {
      await fetch("/api/message-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: activeSession, chatId: activeChatId, messageId }),
      });
      await loadMessages();
    } finally {
      setActingOn(null);
    }
  }

  async function forwardIt(messageId: string) {
    if (!activeSession) return;
    const target = window.prompt("Kirim ke chatId mana? (mis. 6281234567890@c.us)");
    if (!target) return;
    setActingOn(messageId);
    try {
      const res = await fetch("/api/message-forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: activeSession, chatId: target, messageId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal meneruskan pesan");
      alert("Pesan diteruskan.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal meneruskan pesan");
    } finally {
      setActingOn(null);
    }
  }

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chats.filter((c) => {
      if (q) {
        const name = (c.name ?? c.id).toLowerCase();
        const snippet = (c.lastMessage?.body ?? "").toLowerCase();
        if (!name.includes(q) && !snippet.includes(q)) return false;
      }
      const a = assignments[c.id] ?? UNASSIGNED;
      if (filterMode === "mine") return a.assignedTo === myUserId && a.status === "open";
      if (filterMode === "unassigned") return !a.assignedTo && a.status === "open";
      if (filterMode === "resolved") return a.status === "resolved";
      return true;
    });
  }, [chats, search, assignments, filterMode, myUserId]);

  function memberName(id: string | null) {
    if (!id) return null;
    return teamMembers.find((m) => m.id === id)?.username ?? null;
  }

  function applyTemplate(t: MessageTemplate) {
    if (!activeChatId) return;
    const chat = chats.find((c) => c.id === activeChatId);
    setText(substituteVariables(t.body, { chatId: activeChatId, name: chat?.name ?? undefined }));
    setShowTemplates(false);
  }

  async function send() {
    if (!activeSession || !activeChatId || !text.trim()) return;
    setSending(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingRef.current = false;
    try {
      const res = await fetch(replyTo ? "/api/message-reply" : "/api/send-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          replyTo
            ? { session: activeSession, chatId: activeChatId, replyTo: replyTo.id, text: text.trim() }
            : { session: activeSession, chatId: activeChatId, text: text.trim() },
        ),
      });
      if (res.ok) {
        setText("");
        setReplyTo(null);
        await loadMessages();
        await loadChats();
      }
    } finally {
      setSending(false);
    }
  }

  function attachEndpoint(mimetype: string): string {
    if (mimetype.startsWith("image/")) return "/api/send-image";
    if (mimetype.startsWith("video/")) return "/api/send-video";
    return "/api/send-file";
  }

  async function sendAttachment(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || !activeSession || !activeChatId) return;
    if (file.size > 15 * 1024 * 1024) {
      setImageError("Ukuran file maksimal 15MB.");
      return;
    }
    setImageError(null);
    setSendingImage(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",")[1] ?? "";
      const mimetype = file.type || "application/octet-stream";
      const res = await fetch(attachEndpoint(mimetype), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session: activeSession,
          chatId: activeChatId,
          file: { mimetype, filename: file.name, data: base64 },
          caption: text.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengirim file");
      setText("");
      await loadMessages();
      await loadChats();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Gagal mengirim file");
    } finally {
      setSendingImage(false);
    }
  }

  if (sessions.length === 0) {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: "0 20px" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: 12 }}>Belum ada nomor tersambung</h1>
        <p style={{ color: "var(--ink-soft)", marginBottom: 20 }}>
          Sambungkan nomor WhatsApp pertama Anda untuk mulai menerima pesan di sini.
        </p>
        <Link href="/connect" className="btn">
          Hubungkan sekarang
        </Link>
      </div>
    );
  }

  const activeChat = chats.find((c) => c.id === activeChatId);

  return (
    <div className="inbox-shell">
      <div className="inbox-left">
        <div className="sess-switch">
          <select
            value={activeSession ?? ""}
            onChange={(e) => router.push(`/inbox?session=${encodeURIComponent(e.target.value)}`)}
            className="field"
          >
            {sessions.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} — {label(s.status)}
              </option>
            ))}
          </select>
        </div>

        <div className="convlist">
          <input
            className="search"
            placeholder="Cari percakapan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {teamMembers.length > 1 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "0 12px 10px" }}>
              {(
                [
                  ["all", "Semua"],
                  ["mine", "Punya saya"],
                  ["unassigned", "Belum ditugaskan"],
                  ["resolved", "Selesai"],
                ] as const
              ).map(([mode, chipLabel]) => (
                <button
                  key={mode}
                  type="button"
                  className={filterMode === mode ? "btn" : "btn secondary"}
                  style={{ padding: "4px 10px", fontSize: "0.72rem" }}
                  onClick={() => setFilterMode(mode)}
                >
                  {chipLabel}
                </button>
              ))}
            </div>
          )}
          {chatsLoading ? (
            <div style={{ padding: "20px 16px", fontSize: "0.8rem", color: "var(--ink-soft)" }}>
              Menyinkronkan chat pertama kali… bisa sampai 30 detik.
            </div>
          ) : chats.length === 0 ? (
            <div style={{ padding: "20px 16px", fontSize: "0.8rem", color: "var(--ink-soft)" }}>
              Belum ada percakapan masuk.
            </div>
          ) : filteredChats.length === 0 ? (
            <div style={{ padding: "20px 16px", fontSize: "0.8rem", color: "var(--ink-soft)" }}>
              Tidak ada percakapan yang cocok dengan &quot;{search}&quot;.
            </div>
          ) : null}
          {filteredChats.map((c) => {
            const a = assignments[c.id] ?? UNASSIGNED;
            const assigneeName = memberName(a.assignedTo);
            return (
              <button
                key={c.id}
                className={`conv${c.id === activeChatId ? " active" : ""}`}
                onClick={() => setActiveChatId(c.id)}
              >
                <div className="avatar-sm">{initials(c.name ?? c.id)}</div>
                <div className="meta">
                  <div className="top">
                    <span className="name">{c.name ?? c.id.split("@")[0]}</span>
                    <span className="time mono">{formatTime(c.lastMessage?.timestamp)}</span>
                  </div>
                  <div className="snippet">
                    {c.lastMessage?.fromMe ? "Anda: " : ""}
                    {c.lastMessage?.body ?? ""}
                  </div>
                  {teamMembers.length > 1 && (a.assignedTo || a.status === "resolved") && (
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      {assigneeName && (
                        <span className="badge pending" style={{ fontSize: "0.65rem" }}>
                          {assigneeName}
                        </span>
                      )}
                      {a.status === "resolved" && (
                        <span className="badge good" style={{ fontSize: "0.65rem" }}>
                          Selesai
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="thread">
        {!activeChatId ? (
          <div className="empty">Pilih percakapan di sebelah kiri</div>
        ) : (
          <>
            <div className="head">
              <div className="who">
                {activeChat?.name ?? activeChatId.split("@")[0]}
                <small className="mono">{activeChatId}</small>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                {teamMembers.length > 1 && (
                  <select
                    className="field"
                    style={{ width: 150, fontSize: "0.78rem", padding: "6px 8px" }}
                    value={(assignments[activeChatId] ?? UNASSIGNED).assignedTo ?? ""}
                    onChange={(e) => updateAssignment(activeChatId, { assignedTo: e.target.value || null })}
                  >
                    <option value="">Belum ditugaskan</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.username}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  className={`btn ${(assignments[activeChatId] ?? UNASSIGNED).status === "resolved" ? "secondary" : ""}`}
                  style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                  onClick={() =>
                    updateAssignment(activeChatId, {
                      status: (assignments[activeChatId] ?? UNASSIGNED).status === "resolved" ? "open" : "resolved",
                    })
                  }
                >
                  {(assignments[activeChatId] ?? UNASSIGNED).status === "resolved" ? "Buka Lagi" : "Tandai Selesai"}
                </button>
                <button
                  type="button"
                  className={showNotes ? "btn" : "btn secondary"}
                  style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                  onClick={() => setShowNotes((v) => !v)}
                >
                  📝 Catatan
                </button>
                <span className="badge good">Terhubung</span>
              </div>
            </div>
            {showNotes && (
              <div
                style={{
                  padding: "12px 18px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  background: "var(--surface)",
                }}
              >
                <input
                  className="field"
                  placeholder="Tag (pisahkan dengan koma), mis. VIP, Reseller"
                  value={noteTags}
                  onChange={(e) => {
                    setNoteTags(e.target.value);
                    setNoteSaved(false);
                  }}
                  onBlur={saveNote}
                  style={{ fontSize: "0.82rem" }}
                />
                <textarea
                  className="compose"
                  placeholder="Catatan internal tentang kontak ini…"
                  value={noteText}
                  onChange={(e) => {
                    setNoteText(e.target.value);
                    setNoteSaved(false);
                  }}
                  onBlur={saveNote}
                  style={{ minHeight: 60, fontSize: "0.82rem" }}
                />
                <span style={{ fontSize: "0.7rem", color: "var(--ink-soft)" }}>
                  {noteSaved ? "Tersimpan" : "Menyimpan saat keluar dari kolom…"}
                </span>
              </div>
            )}
            <div className="msgs" ref={msgsBoxRef}>
              {messagesLoading && messages.length === 0 && (
                <div style={{ color: "var(--ink-soft)", fontSize: "0.82rem" }}>Memuat pesan…</div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`msg-row ${m.fromMe ? "out" : "in"}`}>
                  <div className={`bub ${m.fromMe ? "out" : "in"}`}>
                    {m.hasMedia && m.media && <MediaContent media={m.media} />}
                    {m.hasMedia && !m.media && <div className="media-fallback">📎 Media tidak tersedia</div>}
                    {m.body && <div className={m.hasMedia ? "bub-caption" : undefined}>{m.body}</div>}
                    <span className="t mono">{formatTime(m.timestamp)}</span>
                  </div>
                  <div className="msg-actions">
                    <button
                      title="Suka"
                      disabled={actingOn === m.id}
                      onClick={() => reactTo(m.id, "👍")}
                    >
                      👍
                    </button>
                    <button
                      title="Bintangi"
                      disabled={actingOn === m.id}
                      onClick={() => starIt(m.id, true)}
                    >
                      ⭐
                    </button>
                    <button
                      title="Balas"
                      disabled={actingOn === m.id}
                      onClick={() => setReplyTo({ id: m.id, preview: m.body || "Media" })}
                    >
                      ↩
                    </button>
                    <button
                      title="Teruskan"
                      disabled={actingOn === m.id}
                      onClick={() => forwardIt(m.id)}
                    >
                      ↪
                    </button>
                    {m.fromMe && (
                      <button title="Hapus" disabled={actingOn === m.id} onClick={() => deleteIt(m.id)}>
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={msgsEndRef} />
            </div>
            {imageError && (
              <p style={{ color: "var(--danger)", fontSize: "0.78rem", padding: "0 18px" }}>
                {imageError}
              </p>
            )}
            {replyTo && (
              <div className="reply-banner">
                <span>
                  Membalas: <em>{replyTo.preview.slice(0, 80)}</em>
                </span>
                <button onClick={() => setReplyTo(null)}>✕</button>
              </div>
            )}
            {showTemplates && (
              <div
                style={{
                  margin: "0 18px 8px",
                  maxHeight: 220,
                  overflowY: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: 11,
                  background: "var(--surface)",
                }}
              >
                {templates.length === 0 ? (
                  <p style={{ padding: 14, fontSize: "0.8rem", color: "var(--ink-soft)" }}>
                    Belum ada template.{" "}
                    <Link href="/templates" style={{ color: "var(--primary)" }}>
                      Buat template
                    </Link>
                  </p>
                ) : (
                  templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 14px",
                        borderBottom: "1px solid var(--border)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>{t.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>
                        {t.body.slice(0, 70)}
                        {t.body.length > 70 ? "…" : ""}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            <div className="composer">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
                style={{ display: "none" }}
                onChange={(e) => sendAttachment(e.target.files)}
              />
              <button
                className="btn secondary"
                style={{ padding: "8px 10px" }}
                title="Lampirkan gambar, video, atau dokumen"
                onClick={() => fileInputRef.current?.click()}
                disabled={sendingImage}
              >
                {sendingImage ? "…" : "📎"}
              </button>
              <button
                type="button"
                className={showTemplates ? "btn" : "btn secondary"}
                style={{ padding: "8px 10px" }}
                title="Pakai template"
                onClick={() => setShowTemplates((v) => !v)}
              >
                📋
              </button>
              <input
                className="field"
                placeholder="Tulis balasan…"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  notifyTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button className="send" onClick={send} disabled={sending || !text.trim()}>
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
