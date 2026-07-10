"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface SessionInfo {
  name: string;
  status: string;
}

interface SentItem {
  id: string;
  chatId: string;
  preview: string;
  time: string;
}

function toChatId(input: string) {
  const trimmed = input.trim();
  if (trimmed.includes("@")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  return `${digits}@c.us`;
}

export default function SendPage() {
  return (
    <Suspense fallback={null}>
      <SendPageInner />
    </Suspense>
  );
}

function SendPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSession = searchParams.get("session");

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [checkResult, setCheckResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [sending, setSendingMsg] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [history, setHistory] = useState<SentItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data: SessionInfo[]) => {
        setSessions(data);
        if (!activeSession) {
          const working = data.find((s) => s.status === "WORKING");
          if (working) router.replace(`/send?session=${encodeURIComponent(working.name)}`);
        }
      });
  }, [activeSession, router]);

  async function checkNumber() {
    if (!activeSession || !phone.trim()) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const digits = phone.trim().replace(/\D/g, "");
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(activeSession)}/contacts/check?phone=${encodeURIComponent(digits)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengecek nomor");
      setCheckResult(
        data.numberExists
          ? { ok: true, msg: "✅ Nomor terdaftar di WhatsApp" }
          : { ok: false, msg: "❌ Nomor ini tidak terdaftar di WhatsApp" },
      );
    } catch (err) {
      setCheckResult({ ok: false, msg: err instanceof Error ? err.message : "Gagal mengecek nomor" });
    } finally {
      setChecking(false);
    }
  }

  async function send() {
    if (!activeSession || !phone.trim()) return;
    if (!text.trim() && !imageFile) return;
    setSendingMsg(true);
    setFeedback(null);
    const chatId = toChatId(phone);
    try {
      let res: Response;
      if (imageFile) {
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(imageFile);
        });
        const base64 = dataUrl.split(",")[1] ?? "";
        res = await fetch("/api/send-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session: activeSession,
            chatId,
            file: { mimetype: imageFile.type || "image/jpeg", filename: imageFile.name, data: base64 },
            caption: text.trim() || undefined,
          }),
        });
      } else {
        res = await fetch("/api/send-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session: activeSession, chatId, text: text.trim() }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengirim pesan");
      setFeedback({ ok: true, msg: `Terkirim ke ${chatId}` });
      setHistory((h) => [
        {
          id: data.id?._serialized ?? data.id ?? Math.random().toString(36),
          chatId,
          preview: imageFile ? `📎 ${imageFile.name}${text.trim() ? " — " + text.trim() : ""}` : text.trim(),
          time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        },
        ...h,
      ].slice(0, 20));
      setText("");
      setImageFile(null);
      setCheckResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Gagal mengirim pesan" });
    } finally {
      setSendingMsg(false);
    }
  }

  if (sessions.length === 0) {
    return <p style={{ color: "var(--ink-soft)" }}>Belum ada perangkat terhubung.</p>;
  }

  return (
    <div className="send-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: "1rem" }}>Kirim pesan cepat</h2>
          <select
            className="field"
            style={{ maxWidth: 200 }}
            value={activeSession ?? ""}
            onChange={(e) => router.push(`/send?session=${encodeURIComponent(e.target.value)}`)}
          >
            {sessions.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <label style={{ fontSize: "0.78rem", color: "var(--ink-soft)", display: "block", marginBottom: 6 }}>
          Nomor tujuan (atau chatId grup)
        </label>
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <input
            className="field"
            placeholder="mis. 6281234567890"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setCheckResult(null);
            }}
          />
          <button className="btn secondary" onClick={checkNumber} disabled={checking || !phone.trim()}>
            {checking ? "Mengecek…" : "Cek nomor"}
          </button>
        </div>
        {checkResult && (
          <p style={{ fontSize: "0.8rem", color: checkResult.ok ? "var(--success)" : "var(--danger)", marginBottom: 14 }}>
            {checkResult.msg}
          </p>
        )}

        <label style={{ fontSize: "0.78rem", color: "var(--ink-soft)", display: "block", margin: "8px 0 6px" }}>
          Pesan
        </label>
        <textarea
          className="field"
          rows={4}
          placeholder="Tulis pesan…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ resize: "vertical", marginBottom: 10 }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
          <button className="btn secondary" onClick={() => fileInputRef.current?.click()}>
            📎 {imageFile ? "Ganti gambar" : "Lampirkan gambar"}
          </button>
          {imageFile && (
            <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
              {imageFile.name}{" "}
              <button
                onClick={() => {
                  setImageFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                style={{ background: "none", border: "none", color: "var(--danger)" }}
              >
                ✕
              </button>
            </span>
          )}
        </div>

        <button
          className="btn"
          onClick={send}
          disabled={sending || !phone.trim() || (!text.trim() && !imageFile)}
        >
          {sending ? "Mengirim…" : "Kirim pesan"}
        </button>

        {feedback && (
          <p style={{ marginTop: 14, fontSize: "0.85rem", color: feedback.ok ? "var(--success)" : "var(--danger)" }}>
            {feedback.msg}
          </p>
        )}
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: "0.9rem", marginBottom: 12 }}>Riwayat terkirim (sesi ini)</h2>
        {history.length === 0 ? (
          <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>Belum ada pesan terkirim.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((h) => (
              <div key={h.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem" }}>
                  <span className="mono" style={{ color: "var(--ink-soft)" }}>
                    {h.chatId.replace(/@.*/, "")}
                  </span>
                  <span className="mono" style={{ color: "var(--ink-soft)" }}>
                    {h.time}
                  </span>
                </div>
                <div style={{ fontSize: "0.82rem", marginTop: 2 }}>{h.preview || "(tanpa teks)"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
