"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "▤" },
  { href: "/inbox", label: "Inbox", icon: "💬" },
  { href: "/send", label: "Kirim Pesan", icon: "📤" },
  { href: "/contacts", label: "Kontak", icon: "👤" },
  { href: "/groups", label: "Grup", icon: "👥" },
  { href: "/profile", label: "Profil Akun", icon: "⚙" },
  { href: "/connect", label: "Tambah Perangkat", icon: "➕" },
  { href: "/settings", label: "Pengaturan", icon: "🛠" },
  { href: "/docs", label: "Dokumentasi API", icon: "📄" },
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
        <span className="nav-label">Menu</span>
        {NAV.map((item) => {
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
      </nav>
      <div className="foot mono">WAHA · WEBJS engine</div>
    </aside>
  );
}
