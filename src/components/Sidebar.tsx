"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_GROUPS = [
  {
    label: "Menu",
    items: [
      { href: "/", label: "Dashboard", icon: "▤" },
      { href: "/inbox", label: "Inbox", icon: "💬" },
    ],
  },
  {
    label: "Pesan",
    items: [
      { href: "/send", label: "Kirim Pesan", icon: "📤" },
      { href: "/broadcast", label: "Broadcast", icon: "📣" },
      { href: "/templates", label: "Template", icon: "📝" },
      { href: "/flow", label: "Auto-Reply", icon: "🤖" },
    ],
  },
  {
    label: "Kontak",
    items: [
      { href: "/contacts", label: "Kontak", icon: "👤" },
      { href: "/groups", label: "Grup", icon: "👥" },
    ],
  },
  {
    label: "Wawasan",
    items: [{ href: "/reports", label: "Laporan", icon: "📊" }],
  },
  {
    label: "Perangkat",
    items: [
      { href: "/profile", label: "Profil Akun", icon: "⚙" },
      { href: "/connect", label: "Tambah Perangkat", icon: "➕" },
    ],
  },
  {
    label: "Lainnya",
    items: [
      { href: "/settings", label: "Pengaturan", icon: "🛠" },
      { href: "/docs", label: "Dokumentasi API", icon: "📄" },
    ],
  },
];

export default function Sidebar({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <Link href="/" className="brand" onClick={onNavigate}>
        <span className="mark">A</span>
        <span className="brand-text">
          <span className="bname">Arunika · WA</span>
          <span className="btag">GATEWAY PLATFORM</span>
        </span>
      </Link>
      <nav>
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <span className="nav-label">{group.label}</span>
            {group.items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link${active ? " active" : ""}`}
                  onClick={onNavigate}
                >
                  <span className="ic">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="foot mono">WAHA · WEBJS engine</div>
    </aside>
  );
}
