"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Plan {
  id: string;
  name: string;
  priceRp: number;
  deviceLimit: number;
  monthlyMessageQuota: number | null;
  isFree: boolean;
}

const FEATURES = [
  { icon: "📤", title: "Kirim & Terima Pesan", body: "Teks, gambar, file, lokasi, kontak — dari dashboard atau API Anda sendiri." },
  { icon: "📣", title: "Broadcast Terjadwal", body: "Kirim ke banyak kontak sekaligus, langsung atau dijadwalkan, dengan variabel nama/nomor otomatis." },
  { icon: "🤖", title: "Auto-Reply Bawaan", body: "Balasan otomatis berbasis kata kunci, jam operasional, dan pesan sambutan — tanpa coding." },
  { icon: "👥", title: "Tim Tak Terbatas", body: "Tambahkan staf/agent sebanyak yang Anda perlukan, di paket apa pun — termasuk yang gratis." },
  { icon: "🔌", title: "API & Webhook", body: "Integrasikan langsung ke sistem Anda dengan API key sendiri dan event real-time." },
  { icon: "📊", title: "Laporan Lengkap", body: "Volume pesan, performa tim, dan penggunaan API — semua dalam satu dashboard." },
];

const WHY = [
  { title: "Harga jujur, mulai dari Rp0", body: "Tidak ada biaya tersembunyi. Paket gratis benar-benar bisa dipakai, bukan cuma demo." },
  { title: "Satu akun, satu tim", body: "Kebanyakan WA gateway kenakan biaya per-user. Di sini, staf tak terbatas gratis di semua paket." },
  { title: "Setup dalam hitungan menit", body: "Scan QR seperti WhatsApp Web — tidak perlu proses verifikasi bisnis yang panjang." },
];

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
          padding: "72px 20px 90px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -100,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "var(--sun-gradient)",
            opacity: 0.16,
          }}
        />
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <span
            className="badge good"
            style={{ background: "rgba(255,255,255,0.12)", color: "#fff", marginBottom: 20 }}
          >
            WhatsApp Gateway untuk Bisnis
          </span>
          <h1 style={{ fontSize: "2.3rem", fontWeight: 800, lineHeight: 1.2, margin: "18px 0 16px" }}>
            Kelola WhatsApp bisnis Anda — bersama seluruh tim, dengan harga yang masuk akal.
          </h1>
          <p style={{ color: "rgba(255,255,255,0.78)", fontSize: "1rem", lineHeight: 1.6, marginBottom: 32 }}>
            Broadcast, auto-reply, API, dan staf tak terbatas — mulai gratis, upgrade kapan saja.
            Tidak perlu kartu kredit untuk mencoba.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" className="btn" style={{ padding: "12px 24px", fontSize: "0.95rem" }}>
              Mulai Gratis Sekarang
            </Link>
            <Link
              href="/help"
              className="btn secondary"
              style={{ padding: "12px 24px", fontSize: "0.95rem", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              Pelajari Fitur
            </Link>
          </div>
        </div>
      </section>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "64px 20px 80px" }}>
        {/* Why */}
        <section style={{ marginBottom: 64 }}>
          <div className="grid3" style={{ gap: 20 }}>
            {WHY.map((w) => (
              <div key={w.title} className="card cpad" style={{ padding: 22 }}>
                <strong style={{ fontSize: "0.95rem", display: "block", marginBottom: 8 }}>{w.title}</strong>
                <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>{w.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section style={{ marginBottom: 64 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 8 }}>Semua yang Anda butuhkan</h2>
            <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>Satu dashboard untuk seluruh operasional WhatsApp bisnis Anda.</p>
          </div>
          <div className="grid3" style={{ gap: 14 }}>
            {FEATURES.map((f) => (
              <div className="card cpad" key={f.title} style={{ padding: 18 }}>
                <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{f.icon}</div>
                <strong style={{ fontSize: "0.88rem", display: "block", marginBottom: 6 }}>{f.title}</strong>
                <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", margin: 0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        {plans.length > 0 && (
          <section style={{ marginBottom: 64 }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 8 }}>Harga Transparan</h2>
              <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>
                Semua fitur tersedia di semua paket — bedanya cuma jumlah perangkat & kuota pesan.
              </p>
            </div>
            <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              {plans.map((p) => (
                <div key={p.id} className="card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: 6 }}>{p.name}</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 10 }}>
                    {p.priceRp === 0 ? "Gratis" : `Rp${p.priceRp.toLocaleString("id-ID")}`}
                    {p.priceRp > 0 && <small style={{ fontSize: "0.65rem", fontWeight: 500 }}> /bulan</small>}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginBottom: 4 }}>{p.deviceLimit} perangkat WA</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
                    {p.monthlyMessageQuota ? `${p.monthlyMessageQuota.toLocaleString("id-ID")} pesan/bulan` : "Kuota tanpa batas"}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <Link href="/help" style={{ fontSize: "0.85rem", color: "var(--primary)" }}>
                Lihat detail fitur & FAQ →
              </Link>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section
          className="card cpad"
          style={{
            padding: 44,
            textAlign: "center",
            background: "var(--primary-gradient)",
            border: "none",
          }}
        >
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 10, color: "#04271f" }}>
            Siap mulai? Daftar gratis dalam 2 menit.
          </h2>
          <p style={{ color: "#0a3d36", fontSize: "0.88rem", marginBottom: 22 }}>
            Tidak perlu kartu kredit. Upgrade kapan saja saat bisnis Anda berkembang.
          </p>
          <Link
            href="/register"
            className="btn"
            style={{ background: "#04271f", color: "#fff", padding: "12px 28px", fontSize: "0.95rem" }}
          >
            Daftar Sekarang
          </Link>
        </section>
      </main>

      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "24px 28px",
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
