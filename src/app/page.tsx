"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Banknote,
  BellRing,
  Bot,
  ChartColumn,
  CheckCircle2,
  Code2,
  Headset,
  Megaphone,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Smartphone,
  Store,
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

const STEPS: { title: string; body: string }[] = [
  { title: "Hubungkan nomor", body: "Scan QR seperti WhatsApp Web. Nomor bisnis Anda langsung aktif — tanpa proses verifikasi bisnis yang panjang." },
  { title: "Atur otomasi & tim", body: "Nyalakan auto-reply, siapkan template & broadcast, lalu undang staf sebanyak yang Anda perlukan — semua tanpa coding." },
  { title: "Kelola dari satu tempat", body: "Balas chat, pantau laporan, dan sambungkan ke sistem Anda lewat API — dari dashboard yang sama." },
];

const USECASES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Store, title: "Toko online & UMKM", body: "Konfirmasi order, kirim katalog, dan follow-up pelanggan secara otomatis." },
  { icon: Headset, title: "Customer service", body: "Bagi chat ke banyak agen tetap dalam satu nomor. Auto-reply saat di luar jam kerja." },
  { icon: BellRing, title: "Notifikasi & reminder", body: "Kirim invoice, resi, jadwal, atau pengingat lewat API secara terjadwal." },
  { icon: Code2, title: "Developer & integrasi", body: "REST API + webhook real-time untuk menyambungkan WhatsApp ke aplikasi Anda." },
];

const FAQ: { q: string; a: string }[] = [
  { q: "Perlu WhatsApp Business API resmi?", a: "Tidak. Arunika memakai koneksi seperti WhatsApp Web — cukup scan QR dari nomor Anda, tanpa verifikasi bisnis yang panjang atau biaya per pesan." },
  { q: "Apakah nomor saya aman?", a: "Data tiap akun terisolasi penuh. Gunakan pola pengiriman yang wajar (hindari spam) agar nomor tetap sehat — Arunika menyediakan jeda kirim dan kontrol kuota untuk membantu." },
  { q: "Berapa nomor/perangkat yang bisa dihubungkan?", a: "Tergantung paket: gratis 1 perangkat, paket berbayar lebih banyak. Jumlah staf/tim selalu tak terbatas di semua paket." },
  { q: "Bagaimana cara pembayarannya?", a: "Lewat QRIS — bisa semua e-wallet dan mobile banking. Anda bisa upgrade atau downgrade kapan saja." },
  { q: "Bisa integrasi ke aplikasi saya sendiri?", a: "Bisa. Setiap akun mendapat API key sendiri plus webhook real-time untuk mengirim dan menerima pesan langsung dari sistem Anda." },
  { q: "Apakah paket gratis benar-benar gratis?", a: "Ya, Rp0 dan bukan trial. Anda dapat 1 perangkat dengan kuota bulanan — cocok untuk mulai mencoba atau usaha berskala kecil." },
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

        {/* Cara kerja */}
        <section className="lp-section">
          <div className="lp-sec-head">
            <h2>Aktif dalam 3 langkah</h2>
            <p>Dari nomor kosong sampai otomatis membalas — tanpa tim teknis.</p>
          </div>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div key={s.title} className="lp-step">
                <div className="num">{i + 1}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Untuk siapa */}
        <section className="lp-section">
          <div className="lp-sec-head">
            <h2>Dipakai untuk apa saja</h2>
            <p>Satu platform, banyak kebutuhan bisnis.</p>
          </div>
          <div className="lp-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
            {USECASES.map((u) => {
              const Icon = u.icon;
              return (
                <div key={u.title} className="lp-card">
                  <span className="lp-ic">
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <h3>{u.title}</h3>
                  <p>{u.body}</p>
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

        {/* FAQ */}
        <section className="lp-section" id="faq">
          <div className="lp-sec-head">
            <h2>Pertanyaan yang sering ditanya</h2>
            <p>Masih ada yang mengganjal? Cek dulu di sini.</p>
          </div>
          <div className="lp-faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <div className="a">{f.a}</div>
              </details>
            ))}
          </div>
        </section>

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
