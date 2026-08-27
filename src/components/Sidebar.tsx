"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessagesSquare,
  Send,
  Megaphone,
  FileText,
  Bot,
  Contact,
  Users,
  UsersRound,
  BarChart3,
  UserCog,
  Smartphone,
  Settings2,
  FileCode2,
  LifeBuoy,
  CreditCard,
  ReceiptText,
  Gift,
  Package,
  Building2,
  Target,
  KeyRound,
  type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon; feature?: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Menu",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/inbox", label: "Inbox", icon: MessagesSquare },
    ],
  },
  {
    label: "Pesan",
    items: [
      { href: "/send", label: "Kirim Pesan", icon: Send },
      { href: "/broadcast", label: "Broadcast", icon: Megaphone, feature: "broadcast" },
      { href: "/templates", label: "Template", icon: FileText, feature: "templates" },
      { href: "/flow", label: "Auto-Reply", icon: Bot, feature: "autoreply" },
    ],
  },
  {
    label: "Kontak",
    items: [
      { href: "/contacts", label: "Kontak", icon: Contact },
      { href: "/groups", label: "Grup", icon: Users },
    ],
  },
  {
    label: "Wawasan",
    items: [{ href: "/reports", label: "Laporan", icon: BarChart3 }],
  },
  {
    label: "Perangkat",
    items: [
      { href: "/profile", label: "Profil Akun", icon: UserCog },
      { href: "/connect", label: "Tambah Perangkat", icon: Smartphone },
    ],
  },
  {
    label: "Lainnya",
    items: [
      { href: "/settings", label: "Pengaturan", icon: Settings2 },
      { href: "/docs", label: "Dokumentasi API", icon: FileCode2 },
      { href: "/help", label: "Pusat Bantuan", icon: LifeBuoy },
    ],
  },
];

const TENANT_GROUP: NavGroup = {
  label: "Akun",
  items: [
    { href: "/account/plan", label: "Paket Saya", icon: CreditCard },
    { href: "/account/billing", label: "Riwayat Tagihan", icon: ReceiptText },
    { href: "/settings/team", label: "Kelola Tim", icon: UsersRound },
    { href: "/account/referral", label: "Program Referral", icon: Gift },
  ],
};

const SUPERADMIN_GROUP: NavGroup = {
  label: "Platform",
  items: [
    { href: "/admin/plans", label: "Kelola Paket", icon: Package },
    { href: "/admin/tenants", label: "Kelola Tenant", icon: Building2 },
    { href: "/admin/leads", label: "Leads & Marketing", icon: Target },
    { href: "/admin/ai-providers", label: "API Key AI", icon: KeyRound },
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
      <Link href="/dashboard" className="brand" onClick={onNavigate}>
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
              const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link${active ? " active" : ""}`}
                  onClick={onNavigate}
                >
                  <Icon className="ic" size={18} strokeWidth={2} aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="foot">© 2026 Arunika · WA</div>
    </aside>
  );
}
