"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // best-effort — a failed poll just tries again next interval
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }

  async function openNotification(n: Notification) {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {});
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div style={{ position: "relative" }} ref={boxRef}>
      <button
        className="btn secondary"
        style={{ padding: "6px 10px", position: "relative" }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifikasi"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "var(--danger)",
              color: "#fff",
              borderRadius: 100,
              fontSize: "0.62rem",
              fontWeight: 700,
              minWidth: 16,
              height: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 340,
            maxHeight: 420,
            overflowY: "auto",
            zIndex: 50,
            padding: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 14px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <strong style={{ fontSize: "0.85rem" }}>Notifikasi</strong>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{ fontSize: "0.72rem", color: "var(--ink-soft)", background: "none", border: "none", cursor: "pointer" }}
              >
                Tandai semua dibaca
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p style={{ padding: 18, fontSize: "0.82rem", color: "var(--ink-soft)", textAlign: "center" }}>
              Belum ada notifikasi.
            </p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openNotification(n)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 14px",
                  background: n.read ? "none" : "var(--success-bg)",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: 3 }}>{n.title}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginBottom: 4 }}>{n.body}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--ink-soft)" }}>{timeAgo(n.createdAt)}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
