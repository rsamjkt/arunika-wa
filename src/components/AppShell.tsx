"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import ThemeToggle from "./ThemeToggle";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/inbox": "Inbox",
  "/send": "Kirim Pesan",
  "/contacts": "Kontak",
  "/groups": "Grup",
  "/profile": "Profil Akun",
  "/connect": "Tambah Perangkat",
  "/docs": "Dokumentasi API",
  "/settings": "Pengaturan",
  "/settings/users": "Manajemen User",
  "/settings/api-keys": "API Key",
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const title = TITLES[pathname] ?? "Arunika · WA";

  if (pathname === "/login") {
    return <>{children}</>;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="app-shell">
      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 20,
          }}
        />
      )}
      <div className="app-main">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="menu-btn" onClick={() => setOpen(true)} aria-label="Buka menu">
              ☰
            </button>
            <h1>{title}</h1>
          </div>
          <div className="actions">
            <ThemeToggle />
            <button className="btn secondary" onClick={logout} style={{ padding: "6px 12px" }}>
              Keluar
            </button>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
