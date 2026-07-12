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

function IconBadge({ icon: Icon, tone = "dark" }: { icon: typeof MessageSquare; tone?: "dark" | "light" }) {
  const dark = tone === "dark";
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 11,
        background: dark ? "#0a3d36" : "rgba(255,255,255,0.14)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
      }}
    >
      <Icon size={19} color={dark ? "#5eead4" : "#ffffff"} strokeWidth={2} />
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
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 28px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="brand">
          <span className="mark">A</span>
          Arunika · WA
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/help" style={{ fontSize: "0.85rem", color: "var(--ink-soft)", marginRight: 6 }}>
            Bantuan
          </Link>
          <Link href="/login" className="btn secondary">
            Masuk
          </Link>
          <Link href="/register" className="btn">
            Daftar Gratis
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(160deg, #0a3d36 0%, #0f5245 55%, #137a5e 100%)",
          color: "#fff",
          padding: "80px 20px 96px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -100,
            width: 440,
            height: 440,
            borderRadius: "50%",
            background: "var(--sun-gradient)",
            opacity: 0.14,
          }}
        />
        <div style={{ maxWidth: 740, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <span
            style={{
              display: "inline-block",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 100,
              padding: "6px 16px",
              fontSize: "0.76rem",
              fontWeight: 700,
              letterSpacing: "0.02em",
              marginBottom: 22,
            }}
          >
            WhatsApp Gateway untuk Bisnis
          </span>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, lineHeight: 1.22, margin: "0 0 18px", letterSpacing: "-0.01em" }}>
            Kelola WhatsApp bisnis Anda — bersama seluruh tim, dengan harga yang masuk akal.
          </h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "1.02rem", lineHeight: 1.65, marginBottom: 36, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            Broadcast, auto-reply, API, dan staf tak terbatas — mulai gratis, upgrade kapan saja.
            Tidak perlu kartu kredit untuk mencoba.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
            <Link
              href="/register"
              className="btn"
              style={{ padding: "13px 26px", fontSize: "0.95rem", display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              Mulai Gratis Sekarang
              <ArrowRight size={17} />
            </Link>
            <Link
              href="/help"
              className="btn secondary"
              style={{
                padding: "13px 26px",
                fontSize: "0.95rem",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.22)",
              }}
            >
              Pelajari Fitur
            </Link>
          </div>
          <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap", fontSize: "0.8rem", color: "rgba(255,255,255,0.65)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <ShieldCheck size={15} /> Data terisolasi per akun
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <QrCode size={15} /> Pembayaran via QRIS
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Zap size={15} /> Aktif dalam hitungan menit
            </span>
          </div>
        </div>
      </section>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "72px 20px 88px" }}>
        {/* Why */}
        <section style={{ marginBottom: 72 }}>
          <div className="grid3" style={{ gap: 20 }}>
            {WHY.map((w) => (
              <div key={w.title} className="card cpad" style={{ padding: 24 }}>
                <IconBadge icon={w.icon} />
                <strong style={{ fontSize: "0.98rem", display: "block", marginBottom: 8 }}>{w.title}</strong>
                <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", margin: 0, lineHeight: 1.65 }}>{w.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section style={{ marginBottom: 72 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 10, letterSpacing: "-0.01em" }}>
              Semua yang Anda butuhkan
            </h2>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.92rem" }}>
              Satu dashboard untuk seluruh operasional WhatsApp bisnis Anda.
            </p>
          </div>
          <div className="grid3" style={{ gap: 16 }}>
            {FEATURES.map((f) => (
              <div className="card cpad" key={f.title} style={{ padding: 20 }}>
                <IconBadge icon={f.icon} />
                <strong style={{ fontSize: "0.9rem", display: "block", marginBottom: 7 }}>{f.title}</strong>
                <p style={{ fontSize: "0.81rem", color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        {plans.length > 0 && (
          <section style={{ marginBottom: 72 }}>
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 10, letterSpacing: "-0.01em" }}>
                Harga Transparan
              </h2>
              <p style={{ color: "var(--ink-soft)", fontSize: "0.92rem", marginBottom: 14 }}>
                Semua fitur tersedia di semua paket — bedanya cuma jumlah perangkat &amp; kuota pesan.
              </p>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  background: "var(--success-bg)",
                  color: "var(--success)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  padding: "6px 14px",
                  borderRadius: 100,
                  marginBottom: 28,
                }}
              >
                <QrCode size={15} />
                Pembayaran aman via QRIS — semua e-wallet &amp; mobile banking
              </div>
            </div>
            <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              {plans.map((p) => (
                <div key={p.id} className="card" style={{ padding: 22 }}>
                  <div style={{ fontWeight: 800, fontSize: "0.96rem", marginBottom: 8 }}>{p.name}</div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: 12 }}>
                    {p.priceRp === 0 ? "Gratis" : `Rp${p.priceRp.toLocaleString("id-ID")}`}
                    {p.priceRp > 0 && <small style={{ fontSize: "0.65rem", fontWeight: 500 }}> /bulan</small>}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginBottom: 5 }}>
                    {p.deviceLimit} perangkat WA
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
                    {p.monthlyMessageQuota ? `${p.monthlyMessageQuota.toLocaleString("id-ID")} pesan/bulan` : "Kuota tanpa batas"}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 26 }}>
              <Link
                href="/help"
                style={{ fontSize: "0.85rem", color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                Lihat detail fitur &amp; FAQ
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section
          className="card cpad"
          style={{
            padding: 48,
            textAlign: "center",
            background: "var(--primary-gradient)",
            border: "none",
          }}
        >
          <CheckCircle2 size={30} color="#04271f" style={{ marginBottom: 14 }} />
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: 10, color: "#04271f" }}>
            Siap mulai? Daftar gratis dalam 2 menit.
          </h2>
          <p style={{ color: "#0a3d36", fontSize: "0.88rem", marginBottom: 24 }}>
            Tidak perlu kartu kredit. Upgrade kapan saja saat bisnis Anda berkembang.
          </p>
          <Link
            href="/register"
            className="btn"
            style={{
              background: "#04271f",
              color: "#fff",
              padding: "13px 30px",
              fontSize: "0.95rem",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Daftar Sekarang
            <ArrowRight size={17} />
          </Link>
        </section>
      </main>

      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "26px 28px",
          textAlign: "center",
          fontSize: "0.78rem",
          color: "var(--ink-soft)",
        }}
      >
        Arunika · WA — WhatsApp Gateway Platform ·{" "}
        <Link href="/help" style={{ color: "var(--primary)" }}>
          Pusat Bantuan
        </Link>
      </footer>
    </div>
  );
}
