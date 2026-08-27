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
  Smartphone,
  Users,
  Webhook,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  priceRp: number;
  deviceLimit: number;
  monthlyMessageQuota: number | null;
  isFree: boolean;
}

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: MessageSquare, title: "Kirim & Terima Pesan", body: "Teks, gambar, file, lokasi, kontak — dari dashboard atau API Anda sendiri." },
  { icon: Megaphone, title: "Broadcast Terjadwal", body: "Kirim ke banyak kontak sekaligus, langsung atau dijadwalkan, dengan variabel nama/nomor otomatis." },
  { icon: Bot, title: "Auto-Reply Cerdas", body: "Balasan otomatis berbasis kata kunci, jam operasional, hingga AI — tanpa perlu coding." },
  { icon: Users, title: "Tim Tak Terbatas", body: "Tambahkan staf/agent sebanyak yang Anda perlukan, di paket apa pun — termasuk yang gratis." },
  { icon: Webhook, title: "API & Webhook", body: "Integrasikan langsung ke sistem Anda dengan API key sendiri dan event real-time." },
  { icon: ChartColumn, title: "Laporan Lengkap", body: "Volume pesan, performa tim, dan penggunaan API — semua dalam satu dashboard." },
];

const WHY: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Banknote, title: "Harga jujur, mulai dari Rp0", body: "Tidak ada biaya tersembunyi. Paket gratis benar-benar bisa dipakai, bukan cuma demo." },
  { icon: Users, title: "Satu akun, satu tim", body: "Kebanyakan WA gateway kenakan biaya per-user. Di sini, staf tak terbatas gratis di semua paket." },
  { icon: Zap, title: "Setup dalam hitungan menit", body: "Scan QR seperti WhatsApp Web — tanpa proses verifikasi bisnis yang panjang." },
];

const PREVIEW_TILES: { icon: LucideIcon; label: string; value: string }[] = [
  { icon: Smartphone, label: "Perangkat", value: "3" },
  { icon: Wifi, label: "Terhubung", value: "3" },
  { icon: MessageSquare, label: "Pesan hari ini", value: "1.284" },
  { icon: Users, label: "Anggota tim", value: "8" },
];

export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then(setPlans)
      .catch(() => {});
  }, []);

  const popularIdx = plans.length >= 3 ? 2 : plans.length - 1;

  return (
    <div className="lp">
      <header className="lp-header">
        <Link href="/" className="lp-brand">
          <span className="m">A</span>
          Arunika · WA
        </Link>
        <nav className="lp-nav">
          <Link href="#fitur" className="hide-sm">
            Fitur
          </Link>
          <Link href="#harga" className="hide-sm">
            Harga
          </Link>
          <Link href="/help" className="hide-sm">
            Bantuan
          </Link>
          <Link href="/login" style={{ color: "var(--ink)", fontWeight: 600 }}>
            Masuk
          </Link>
          <Link href="/register" className="lp-btn lp-btn-primary" style={{ padding: "9px 18px" }}>
            Daftar Gratis
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <span className="lp-eyebrow">
            <Zap size={13} strokeWidth={2.5} />
            WhatsApp Gateway untuk Bisnis
          </span>
          <h1 className="lp-h1">
            Kelola WhatsApp bisnis Anda — <span className="g">bersama seluruh tim.</span>
          </h1>
          <p className="lp-sub">
            Broadcast, auto-reply, API, dan staf tak terbatas — mulai gratis, upgrade kapan saja.
            Tidak perlu kartu kredit untuk mencoba.
          </p>
          <div className="lp-cta-row">
            <Link href="/register" className="lp-btn lp-btn-primary">
              Mulai Gratis Sekarang
              <ArrowRight size={17} />
            </Link>
            <Link href="#fitur" className="lp-btn lp-btn-ghost">
              Lihat Fitur
            </Link>
          </div>
          <div className="lp-trust">
            <span>
              <ShieldCheck size={16} /> Data terisolasi per akun
            </span>
            <span>
              <QrCode size={16} /> Pembayaran via QRIS
            </span>
            <span>
              <Zap size={16} /> Aktif dalam hitungan menit
            </span>
          </div>

          {/* Product preview mock */}
          <div className="lp-preview">
            <div className="lp-preview-bar">
              <span className="lp-dot" style={{ background: "#ff5f57" }} />
              <span className="lp-dot" style={{ background: "#febc2e" }} />
              <span className="lp-dot" style={{ background: "#28c840" }} />
            </div>
            <div className="lp-preview-body">
              {PREVIEW_TILES.map((t) => {
                const Icon = t.icon;
                return (
                  <div key={t.label} className="lp-tile">
                    <div className="t-top">
                      <span className="t-lbl">{t.label}</span>
                      <span className="t-ic">
                        <Icon size={15} strokeWidth={2} />
                      </span>
                    </div>
                    <div className="t-val">{t.value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <main className="lp-main">
        {/* Why */}
        <section className="lp-section">
          <div className="lp-grid">
            {WHY.map((w) => {
              const Icon = w.icon;
              return (
                <div key={w.title} className="lp-card">
                  <span className="lp-ic">
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <h3>{w.title}</h3>
                  <p>{w.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Features */}
        <section className="lp-section" id="fitur">
          <div className="lp-sec-head">
            <h2>Semua yang Anda butuhkan</h2>
            <p>Satu dashboard untuk seluruh operasional WhatsApp bisnis Anda.</p>
          </div>
          <div className="lp-grid">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="lp-card">
                  <span className="lp-ic">
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pricing */}
        {plans.length > 0 && (
          <section className="lp-section" id="harga">
            <div className="lp-sec-head">
              <h2>Harga transparan</h2>
              <p>Semua fitur tersedia di semua paket — bedanya cuma jumlah perangkat &amp; kuota pesan.</p>
            </div>
            <div className="lp-price-grid">
              {plans.map((p, i) => (
                <div key={p.id} className={`lp-price${i === popularIdx ? " pop" : ""}`}>
                  {i === popularIdx && <span className="lp-pill">Populer</span>}
                  <div className="nm">{p.name}</div>
                  <div className="amt">
                    {p.priceRp === 0 ? "Gratis" : `Rp${p.priceRp.toLocaleString("id-ID")}`}
                    {p.priceRp > 0 && <small> /bln</small>}
                  </div>
                  <ul>
                    <li>
                      <CheckCircle2 size={15} strokeWidth={2} />
                      {p.deviceLimit} perangkat WA
                    </li>
                    <li>
                      <CheckCircle2 size={15} strokeWidth={2} />
                      {p.monthlyMessageQuota ? `${p.monthlyMessageQuota.toLocaleString("id-ID")} pesan/bln` : "Kuota tanpa batas"}
                    </li>
                    <li>
                      <CheckCircle2 size={15} strokeWidth={2} />
                      Staf/tim tak terbatas
                    </li>
                    <li>
                      <CheckCircle2 size={15} strokeWidth={2} />
                      Semua fitur termasuk
                    </li>
                  </ul>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 28 }}>
              <Link
                href="/help"
                style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}
              >
                Lihat detail fitur &amp; FAQ
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="lp-cta">
          <h2>Siap mulai? Daftar gratis dalam 2 menit.</h2>
          <p>Tidak perlu kartu kredit. Upgrade kapan saja saat bisnis Anda berkembang.</p>
          <Link href="/register" className="lp-btn">
            Daftar Sekarang
            <ArrowRight size={17} />
          </Link>
        </section>
      </main>

      <footer className="lp-footer">
        Arunika · WA — WhatsApp Gateway Platform · <Link href="/help">Pusat Bantuan</Link>
      </footer>
    </div>
  );
}
