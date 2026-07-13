"use client";

import { useEffect, useState } from "react";

interface Transaction {
  orderId: string;
  planName: string;
  totalAmount: number;
  status: "PENDING" | "PAID" | "EXPIRED";
  createdAt: string;
  paidAt: string | null;
  expiredAt: string;
}

function statusBadge(status: Transaction["status"]) {
  if (status === "PAID") return <span className="badge good">Lunas</span>;
  if (status === "PENDING") return <span className="badge pending">Menunggu Bayar</span>;
  return <span className="badge off">Kedaluwarsa</span>;
}

export default function BillingHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/transactions")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error ?? "Gagal memuat riwayat tagihan");
        }
        return r.json();
      })
      .then(setTransactions)
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat riwayat tagihan"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p style={{ color: "var(--ink-soft)" }}>Memuat…</p>;
  }

  if (error) {
    return <p style={{ color: "var(--danger)" }}>{error}</p>;
  }

  return (
    <div>
      <div className="table-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>No. Invoice</th>
              <th>Paket</th>
              <th>Total</th>
              <th>Status</th>
              <th>Dibuat</th>
              <th>Dibayar</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "32px 16px", color: "var(--ink-soft)" }}>
                  Belum ada riwayat tagihan.
                </td>
              </tr>
            )}
            {transactions.map((t) => (
              <tr key={t.orderId}>
                <td className="mono" style={{ fontSize: "0.78rem" }}>{t.orderId}</td>
                <td style={{ fontWeight: 700 }}>{t.planName}</td>
                <td className="mono">Rp{t.totalAmount.toLocaleString("id-ID")}</td>
                <td>{statusBadge(t.status)}</td>
                <td className="mono" style={{ fontSize: "0.78rem" }}>
                  {new Date(t.createdAt).toLocaleString("id-ID")}
                </td>
                <td className="mono" style={{ fontSize: "0.78rem" }}>
                  {t.paidAt ? new Date(t.paidAt).toLocaleString("id-ID") : "—"}
                </td>
                <td>
                  {t.status === "PENDING" && (
                    <a href={`/register/pay/${t.orderId}`} className="btn secondary" style={{ padding: "4px 10px" }}>
                      Bayar
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
