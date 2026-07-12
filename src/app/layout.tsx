import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Arunika · WA",
  description: "Dashboard WhatsApp Gateway untuk bisnis Anda.",
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
    <html lang="id" className={`${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body style={{ fontFamily: "var(--font-sans), -apple-system, sans-serif" }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
