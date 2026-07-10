import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Arunika · WA",
  description: "Dashboard WhatsApp Gateway berbasis WAHA.",
};

const THEME_INIT_SCRIPT = `
try {
  var pref = localStorage.getItem("arunika-theme");
  if (pref === "light" || pref === "dark") {
    document.documentElement.setAttribute("data-theme", pref);
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body style={{ fontFamily: "var(--font-inter), -apple-system, sans-serif" }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
