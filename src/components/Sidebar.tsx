"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: string; feature?: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
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
      { href: "/broadcast", label: "Broadcast", icon: "📣", feature: "broadcast" },
      { href: "/templates", label: "Template", icon: "📝", feature: "templates" },
      { href: "/flow", label: "Auto-Reply", icon: "🤖", feature: "autoreply" },
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
      { href: "/help", label: "Pusat Bantuan", icon: "❓" },
    ],
  },
];

const TENANT_GROUP: NavGroup = {
  label: "Akun",
  items: [
    { href: "/account/plan", label: "Paket Saya", icon: "💳" },
    { href: "/settings/team", label: "Kelola Tim", icon: "👥" },
    { href: "/account/referral", label: "Program Referral", icon: "🎁" },
  ],
};

const SUPERADMIN_GROUP: NavGroup = {
  label: "Platform",
  items: [
    { href: "/admin/plans", label: "Kelola Paket", icon: "📦" },
    { href: "/admin/tenants", label: "Kelola Tenant", icon: "🏢" },
  ],
};

interface Me {
  role: "superadmin" | "tenant" | "tenant_staff";
  isOwner: boolean;
  plan: { features: string[] } | null;
}

export default function Sidebar({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => {});
  }, []);

  const isSuperadmin = me?.role === "superadmin";
  const isTenantOwner = me?.role === "tenant";
  const features = me?.plan?.features ?? [];

  const groups: NavGroup[] = [
    ...NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.feature || isSuperadmin || features.includes(item.feature)),
    })),
    ...(isTenantOwner ? [TENANT_GROUP] : []),
    ...(isSuperadmin ? [SUPERADMIN_GROUP] : []),
  ];

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
        {groups.map((group) => (
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
