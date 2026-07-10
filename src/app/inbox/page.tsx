"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

interface WAMessage {
  id: string;
  timestamp: number;
  fromMe: boolean;
  body: string;
  hasMedia?: boolean;
}

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
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; preview: string } | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const msgsEndRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    setActiveChatId(null);
    setMessages([]);
    setChats([]);
    setSearch("");
    if (!activeSession) return;
    setChatsLoading(true);
    loadChats();
    const id = setInterval(loadChats, 8_000);
    return () => clearInterval(id);
  }, [activeSession, loadChats]);

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
    if (!activeChatId) return;
    loadMessages();
    const id = setInterval(loadMessages, 4_000);
    return () => clearInterval(id);
  }, [activeChatId, loadMessages]);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

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
    if (!q) return chats;
    return chats.filter((c) => {
      const name = (c.name ?? c.id).toLowerCase();
      const snippet = (c.lastMessage?.body ?? "").toLowerCase();
      return name.includes(q) || snippet.includes(q);
    });
  }, [chats, search]);

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

  async function sendImageFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || !activeSession || !activeChatId) return;
    if (file.size > 15 * 1024 * 1024) {
      setImageError("Ukuran gambar maksimal 15MB.");
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
      const res = await fetch("/api/send-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session: activeSession,
          chatId: activeChatId,
          file: { mimetype: file.type || "image/jpeg", filename: file.name, data: base64 },
          caption: text.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengirim gambar");
      setText("");
      await loadMessages();
      await loadChats();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Gagal mengirim gambar");
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
          {filteredChats.map((c) => (
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
              </div>
            </button>
          ))}
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
              <span className="badge good">Terhubung</span>
            </div>
            <div className="msgs">
              {messagesLoading && messages.length === 0 && (
                <div style={{ color: "var(--ink-soft)", fontSize: "0.82rem" }}>Memuat pesan…</div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`msg-row ${m.fromMe ? "out" : "in"}`}>
                  <div className={`bub ${m.fromMe ? "out" : "in"}`}>
                    {m.hasMedia && !m.body ? "📎 Media (pratinjau belum didukung)" : m.body}
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
            <div className="composer">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => sendImageFile(e.target.files)}
              />
              <button
                className="btn secondary"
                style={{ padding: "8px 10px" }}
                title="Lampirkan gambar"
                onClick={() => fileInputRef.current?.click()}
                disabled={sendingImage}
              >
                {sendingImage ? "…" : "📎"}
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
