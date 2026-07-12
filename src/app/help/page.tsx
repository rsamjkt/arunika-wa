"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  ChartColumn,
  MessageSquare,
  Megaphone,
  Users,
  Webhook,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  priceRp: number;
  deviceLimit: number;
  monthlyMessageQuota: number | null;
}

const STEPS = [
  { title: "Daftar akun", body: "Pilih paket (bisa mulai gratis), buat username & password, verifikasi email." },
  { title: "Hubungkan perangkat WA", body: "Scan QR code dari menu Tambah Perangkat pakai WhatsApp di HP Anda — sama seperti WhatsApp Web." },
  { title: "Kirim pesan pertama", body: "Kirim pesan manual, buat broadcast, atau aktifkan auto-reply — semua dari satu dashboard." },
  { title: "Ajak tim (opsional)", body: "Tambahkan staf/agent di Kelola Tim — mereka login terpisah tapi pakai perangkat & kuota yang sama." },
];

const FEATURES = [
  { icon: MessageSquare, title: "Kirim Pesan", body: "Kirim teks, gambar, file, lokasi, dan kontak dari dashboard atau API." },
  { icon: Megaphone, title: "Broadcast", body: "Kirim ke banyak kontak sekaligus, terjadwal atau langsung, dengan variabel nama/nomor." },
  { icon: Bot, title: "Auto-Reply", body: "Balasan otomatis berbasis kata kunci, jam operasional, dan pesan sambutan." },
  { icon: Users, title: "Tim & Kolaborasi", body: "Staf/agent login terpisah, percakapan bisa ditugaskan, riwayat aktivitas per anggota." },
  { icon: Webhook, title: "API & Webhook", body: "Integrasikan ke aplikasi Anda sendiri lewat API key, atau terima event real-time via webhook." },
  { icon: ChartColumn, title: "Laporan", body: "Pantau volume pesan, performa tim, dan penggunaan API dari satu halaman." },
];

const FAQS = [
  {
    q: "Apakah ini WhatsApp Business API resmi dari Meta?",
    a: "Tidak — Arunika-WA berbasis WEBJS (menghubungkan seperti WhatsApp Web), bukan WhatsApp Business API resmi. Ini membuat harga jauh lebih terjangkau, cocok untuk bisnis kecil-menengah yang butuh otomasi tanpa proses verifikasi bisnis resmi Meta.",
  },
  {
    q: "Apakah aman? Bagaimana dengan data saya?",
    a: "Percakapan dan data akun Anda disimpan terisolasi per tenant — tenant lain tidak bisa mengakses data Anda. Kami tidak membagikan data ke pihak ketiga.",
  },
  {
    q: "Bisa pakai berapa nomor WhatsApp?",
    a: "Tergantung paket — mulai dari 1 perangkat di paket gratis sampai 10 perangkat di paket tertinggi. Lihat detail di halaman Harga.",
  },
  {
    q: "Apa itu \"staf/tim tak terbatas\"?",
    a: "Setiap paket (termasuk gratis) memungkinkan Anda menambahkan anggota tim tanpa batas jumlah dan tanpa biaya tambahan — mereka login dengan akun sendiri tapi berbagi perangkat WA dan kuota pesan yang sama dengan akun utama.",
  },
  {
    q: "Bagaimana kalau kuota pesan bulanan habis?",
    a: "Pesan baru akan ditolak sampai kuota reset di awal bulan berikutnya, atau Anda bisa upgrade paket kapan saja dari halaman Paket Saya — perubahan langsung aktif.",
  },
  {
    q: "Bisa berhenti berlangganan kapan saja?",
    a: "Ya. Paket berbayar tidak otomatis diperpanjang tanpa pembayaran baru — kalau tidak diperpanjang, akun otomatis turun ke paket gratis saat masa aktif habis, tanpa kehilangan data.",
  },
  {
    q: "Ada program referral?",
    a: "Ada — setiap tenant punya kode referral sendiri (lihat menu Program Referral setelah login). Setiap orang yang mendaftar pakai kode Anda memberi bonus 7 hari masa aktif paket, otomatis.",
  },
  {
    q: "Metode pembayaran apa yang didukung?",
    a: "QRIS — bisa dibayar dari aplikasi e-wallet atau mobile banking apa pun (GoPay, OVO, Dana, ShopeePay, semua bank). Setelah membuat pesanan, Anda akan menerima invoice berisi kode QRIS lewat email (dan WhatsApp bila nomor HP diisi saat daftar); status pembayaran terverifikasi otomatis begitu dibayar.",
  },
];

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ padding: 0, marginBottom: 10, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "16px 20px",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          fontWeight: 700,
          fontSize: "0.9rem",
        }}
      >
        {q}
        <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 20px 18px", color: "var(--ink-soft)", fontSize: "0.85rem", lineHeight: 1.6 }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then(setPlans)
      .catch(() => {});
    fetch("/api/auth/me")
      .then((r) => setLoggedIn(r.ok))
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
        }}
      >
        <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="mark">A</span>
          Arunika · WA
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          {loggedIn ? (
            <Link href="/dashboard" className="btn">
              Ke Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn secondary">
                Masuk
              </Link>
              <Link href="/register" className="btn">
                Daftar Gratis
              </Link>
            </>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 20px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span className="badge pending" style={{ marginBottom: 14 }}>
            Pusat Bantuan
          </span>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "14px 0 10px" }}>
            Semua yang perlu Anda tahu tentang Arunika-WA
          </h1>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem" }}>
            WhatsApp Gateway untuk bisnis — kirim, otomasi, dan kelola WhatsApp bersama tim, dari satu dashboard.
          </p>
        </div>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 18 }}>Cara Memulai</h2>
          <div className="grid2" style={{ gap: 14 }}>
            {STEPS.map((s, i) => (
              <div className="card cpad" key={s.title} style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "var(--primary-gradient)",
                      color: "#04271f",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <strong style={{ fontSize: "0.9rem" }}>{s.title}</strong>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 18 }}>Fitur</h2>
          <div className="grid3" style={{ gap: 14 }}>
            {FEATURES.map((f) => (
              <div className="card cpad" key={f.title} style={{ padding: 18 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "#0a3d36",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <f.icon size={17} color="#5eead4" strokeWidth={2} />
                </div>
                <strong style={{ fontSize: "0.88rem", display: "block", marginBottom: 6 }}>{f.title}</strong>
                <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", margin: 0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {plans.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 18 }}>Paket & Harga</h2>
            <div className="table-wrap">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Paket</th>
                    <th>Harga</th>
                    <th>Perangkat</th>
                    <th>Kuota Pesan</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700 }}>{p.name}</td>
                      <td className="mono">{p.priceRp === 0 ? "Gratis" : `Rp${p.priceRp.toLocaleString("id-ID")}/bulan`}</td>
                      <td className="mono">{p.deviceLimit}</td>
                      <td className="mono">
                        {p.monthlyMessageQuota ? p.monthlyMessageQuota.toLocaleString("id-ID") : "Tanpa batas"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 18 }}>Pertanyaan Umum</h2>
          {FAQS.map((f) => (
            <Faq key={f.q} q={f.q} a={f.a} />
          ))}
        </section>

        <div className="callout" style={{ marginTop: 40 }}>
          <b>Masih ada pertanyaan?</b>
          {loggedIn
            ? "Hubungi kami lewat WhatsApp atau email yang tertera di dashboard."
            : (
              <>
                Hubungi kami lewat WhatsApp atau email yang tertera di dashboard setelah Anda masuk, atau langsung{" "}
                <Link href="/register" style={{ color: "var(--primary)" }}>
                  coba gratis
                </Link>{" "}
                — tidak perlu kartu kredit.
              </>
            )}
        </div>
      </main>
    </div>
  );
}
