"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Banknote,
  Bot,
  ChartColumn,
  CheckCircle2,
  Megaphone,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Users,
  Webhook,
  Zap,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  priceRp: number;
  deviceLimit: number;
  monthlyMessageQuota: number | null;
  isFree: boolean;
}

const FEATURES = [
  { icon: MessageSquare, title: "Kirim & Terima Pesan", body: "Teks, gambar, file, lokasi, kontak — dari dashboard atau API Anda sendiri." },
  { icon: Megaphone, title: "Broadcast Terjadwal", body: "Kirim ke banyak kontak sekaligus, langsung atau dijadwalkan, dengan variabel nama/nomor otomatis." },
  { icon: Bot, title: "Auto-Reply Bawaan", body: "Balasan otomatis berbasis kata kunci, jam operasional, dan pesan sambutan — tanpa coding." },
  { icon: Users, title: "Tim Tak Terbatas", body: "Tambahkan staf/agent sebanyak yang Anda perlukan, di paket apa pun — termasuk yang gratis." },
  { icon: Webhook, title: "API & Webhook", body: "Integrasikan langsung ke sistem Anda dengan API key sendiri dan event real-time." },
  { icon: ChartColumn, title: "Laporan Lengkap", body: "Volume pesan, performa tim, dan penggunaan API — semua dalam satu dashboard." },
];

const WHY = [
  { icon: Banknote, title: "Harga jujur, mulai dari Rp0", body: "Tidak ada biaya tersembunyi. Paket gratis benar-benar bisa dipakai, bukan cuma demo." },
  { icon: Users, title: "Satu akun, satu tim", body: "Kebanyakan WA gateway kenakan biaya per-user. Di sini, staf tak terbatas gratis di semua paket." },
  { icon: Zap, title: "Setup dalam hitungan menit", body: "Scan QR seperti WhatsApp Web — tidak perlu proses verifikasi bisnis yang panjang." },
];

const INK = "#0f172a";
const INK_SOFT = "#64748b";
const BORDER = "#e2e8f0";
const BG_SOFT = "#f8fafc";
const ACCENT = "#2563eb";

const btnPrimary: React.CSSProperties = {
  background: INK,
  color: "#fff",
  border: "1px solid " + INK,
  borderRadius: 8,
  padding: "12px 22px",
  fontSize: "0.92rem",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  textDecoration: "none",
};

const btnSecondary: React.CSSProperties = {
  background: "#fff",
  color: INK,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "12px 22px",
  fontSize: "0.92rem",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  textDecoration: "none",
};

function IconBox({ icon: Icon }: { icon: typeof MessageSquare }) {
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 9,
        background: "#fff",
        border: `1px solid ${BORDER}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
      }}
    >
      <Icon size={18} color={INK} strokeWidth={1.8} />
    </div>
  );
}

export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then(setPlans)
      .catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: INK }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 28px",
          borderBottom: `1px solid ${BORDER}`,
          background: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="brand">
          <span className="mark">A</span>
          Arunika · WA
        </div>
        <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
          <Link href="/help" style={{ fontSize: "0.88rem", color: INK_SOFT, textDecoration: "none" }}>
            Fitur
          </Link>
          <Link href="/help" style={{ fontSize: "0.88rem", color: INK_SOFT, textDecoration: "none" }}>
            Bantuan
          </Link>
          <Link href="/login" style={{ fontSize: "0.88rem", color: INK, fontWeight: 600, textDecoration: "none" }}>
            Masuk
          </Link>
          <Link href="/register" style={btnPrimary}>
            Daftar Gratis
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: "84px 20px 72px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <span
            style={{
              display: "inline-block",
              color: INK_SOFT,
              fontSize: "0.78rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            WhatsApp Gateway untuk Bisnis
          </span>
          <h1 style={{ fontSize: "2.6rem", fontWeight: 800, lineHeight: 1.2, margin: "0 0 18px", letterSpacing: "-0.02em", color: INK }}>
            Kelola WhatsApp bisnis Anda — bersama seluruh tim.
          </h1>
          <p style={{ color: INK_SOFT, fontSize: "1.02rem", lineHeight: 1.65, marginBottom: 36, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            Broadcast, auto-reply, API, dan staf tak terbatas — mulai gratis, upgrade kapan saja.
            Tidak perlu kartu kredit untuk mencoba.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 44 }}>
            <Link href="/register" style={btnPrimary}>
              Mulai Gratis Sekarang
              <ArrowRight size={17} />
            </Link>
            <Link href="/help" style={btnSecondary}>
              Pelajari Fitur
            </Link>
          </div>
          <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap", fontSize: "0.82rem", color: INK_SOFT }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <ShieldCheck size={16} color={INK} /> Data terisolasi per akun
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <QrCode size={16} color={INK} /> Pembayaran via QRIS
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Zap size={16} color={INK} /> Aktif dalam hitungan menit
            </span>
          </div>
        </div>
      </section>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "72px 20px 88px" }}>
        {/* Why */}
        <section style={{ marginBottom: 80 }}>
          <div className="grid3" style={{ gap: 1, background: BORDER, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            {WHY.map((w) => (
              <div key={w.title} style={{ padding: 26, background: "#fff" }}>
                <IconBox icon={w.icon} />
                <strong style={{ fontSize: "0.98rem", display: "block", marginBottom: 8, color: INK }}>{w.title}</strong>
                <p style={{ fontSize: "0.85rem", color: INK_SOFT, margin: 0, lineHeight: 1.65 }}>{w.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 10, letterSpacing: "-0.01em", color: INK }}>
              Semua yang Anda butuhkan
            </h2>
            <p style={{ color: INK_SOFT, fontSize: "0.92rem" }}>
              Satu dashboard untuk seluruh operasional WhatsApp bisnis Anda.
            </p>
          </div>
          <div className="grid3" style={{ gap: 16 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ padding: 22, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
                <IconBox icon={f.icon} />
                <strong style={{ fontSize: "0.9rem", display: "block", marginBottom: 7, color: INK }}>{f.title}</strong>
                <p style={{ fontSize: "0.81rem", color: INK_SOFT, margin: 0, lineHeight: 1.6 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        {plans.length > 0 && (
          <section style={{ marginBottom: 80 }}>
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 10, letterSpacing: "-0.01em", color: INK }}>
                Harga Transparan
              </h2>
              <p style={{ color: INK_SOFT, fontSize: "0.92rem", marginBottom: 14 }}>
                Semua fitur tersedia di semua paket — bedanya cuma jumlah perangkat &amp; kuota pesan.
              </p>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  border: `1px solid ${BORDER}`,
                  color: INK_SOFT,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: 100,
                  marginBottom: 32,
                }}
              >
                <QrCode size={15} />
                Pembayaran aman via QRIS — semua e-wallet &amp; mobile banking
              </div>
            </div>
            <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              {plans.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: 22,
                    border: p.isFree ? `1px solid ${BORDER}` : `1.5px solid ${INK}`,
                    borderRadius: 12,
                    position: "relative",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 8, color: INK_SOFT }}>{p.name}</div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: INK }}>
                      {p.priceRp === 0 ? "Gratis" : `Rp${p.priceRp.toLocaleString("id-ID")}`}
                    </div>
                    {p.priceRp > 0 && (
                      <small style={{ fontSize: "0.65rem", fontWeight: 500, color: INK_SOFT, display: "block", marginTop: 2 }}>
                        /bulan
                      </small>
                    )}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: INK_SOFT, marginBottom: 5 }}>
                    {p.deviceLimit} perangkat WA
                  </div>
                  <div style={{ fontSize: "0.78rem", color: INK_SOFT }}>
                    {p.monthlyMessageQuota ? `${p.monthlyMessageQuota.toLocaleString("id-ID")} pesan/bulan` : "Kuota tanpa batas"}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 26 }}>
              <Link
                href="/help"
                style={{ fontSize: "0.85rem", color: INK, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}
              >
                Lihat detail fitur &amp; FAQ
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section
          style={{
            padding: 52,
            textAlign: "center",
            background: BG_SOFT,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
          }}
        >
          <CheckCircle2 size={30} color={ACCENT} style={{ marginBottom: 14 }} />
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 10, color: INK }}>
            Siap mulai? Daftar gratis dalam 2 menit.
          </h2>
          <p style={{ color: INK_SOFT, fontSize: "0.88rem", marginBottom: 26 }}>
            Tidak perlu kartu kredit. Upgrade kapan saja saat bisnis Anda berkembang.
          </p>
          <Link href="/register" style={{ ...btnPrimary, padding: "13px 30px" }}>
            Daftar Sekarang
            <ArrowRight size={17} />
          </Link>
        </section>
      </main>

      <footer
        style={{
          borderTop: `1px solid ${BORDER}`,
          padding: "26px 28px",
          textAlign: "center",
          fontSize: "0.78rem",
          color: INK_SOFT,
        }}
      >
        Arunika · WA — WhatsApp Gateway Platform ·{" "}
        <Link href="/help" style={{ color: INK, fontWeight: 600 }}>
          Pusat Bantuan
        </Link>
      </footer>
    </div>
  );
}
