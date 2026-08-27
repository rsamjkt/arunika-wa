"use client";

import { useEffect, useState } from "react";
import { Monitor, Sun, Moon, type LucideIcon } from "lucide-react";

type Pref = "system" | "light" | "dark";

const STORAGE_KEY = "arunika-theme";
const ICON: Record<Pref, LucideIcon> = { system: Monitor, light: Sun, dark: Moon };
const LABEL: Record<Pref, string> = {
  system: "Ikuti sistem",
  light: "Terang",
  dark: "Gelap",
};

function apply(pref: Pref) {
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
}

export default function ThemeToggle() {
  const [pref, setPref] = useState<Pref>("system");

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Pref | null) ?? "system";
    setPref(saved);
  }, []);

  function cycle() {
    const order: Pref[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(pref) + 1) % order.length];
    setPref(next);
    apply(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  const Icon = ICON[pref];

  return (
    <button
      onClick={cycle}
      title={`Tema: ${LABEL[pref]} — klik untuk ganti`}
      aria-label={`Tema: ${LABEL[pref]}`}
      className="btn secondary"
      style={{ padding: "6px 10px" }}
    >
      <Icon size={16} strokeWidth={2} />
    </button>
  );
}
