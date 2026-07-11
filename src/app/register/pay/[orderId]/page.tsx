"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StatusResponse {
  status: "PENDING" | "PAID" | "EXPIRED";
  totalAmount: number;
  qrisImage: string;
  expiredAt: string;
}

export default function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/qris/status/${orderId}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Transaksi tidak ditemukan");
          return;
        }
        setData(json);
        if (json.status === "PAID") {
          setTimeout(() => router.push("/login?paid=1"), 1500);
        }
      } catch {
        // network hiccup — just retry on next tick
      }
    }
    poll();
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [orderId, router]);

  return (
    <div className="login-shell">
      <div className="card onboard-card">
        <div className="brand" style={{ justifyContent: "center", marginBottom: 6 }}>
          <span className="mark">A</span>
          Arunika · WA
        </div>
        <h2>Selesaikan Pembayaran</h2>

        {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

        {!error && !data && <p className="sub">Memuat QRIS…</p>}

        {data && data.status === "PENDING" && (
          <>
            <p className="sub">Scan QRIS di bawah ini dengan aplikasi e-wallet/mobile banking Anda.</p>
            <div className="qr-frame" style={{ width: 240, height: 240 }}>
              {data.qrisImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.qrisImage} alt="QRIS" />
              ) : (
                <span className="placeholder">QR tidak tersedia</span>
              )}
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, margin: "16px 0 4px" }}>
              Rp{data.totalAmount.toLocaleString("id-ID")}
            </div>
            <p style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
              Bayar tepat sesuai nominal di atas (termasuk kode unik) supaya otomatis terverifikasi. Kedaluwarsa{" "}
              {new Date(data.expiredAt).toLocaleString("id-ID")}.
            </p>
            <div className="badge pending" style={{ marginTop: 12 }}>
              Menunggu pembayaran…
            </div>
          </>
        )}

        {data && data.status === "PAID" && (
          <>
            <div className="badge good" style={{ marginBottom: 12 }}>
              Pembayaran berhasil
            </div>
            <p className="sub">Akun Anda sudah aktif. Mengarahkan ke halaman masuk…</p>
          </>
        )}

        {data && data.status === "EXPIRED" && (
          <>
            <div className="badge bad" style={{ marginBottom: 12 }}>
              Kedaluwarsa
            </div>
            <p className="sub">
              QRIS ini sudah kedaluwarsa. Silakan{" "}
              <a href="/register" style={{ color: "var(--primary)" }}>
                daftar ulang
              </a>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}
