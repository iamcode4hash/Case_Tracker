"use client";

import { useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem("ct_theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark";
}

export default function ThemeToggle() {
  const initial = useMemo(() => getInitialTheme(), []);
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    window.localStorage.setItem("ct_theme", theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      style={{
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(255,255,255,0.08)",
        color: "var(--ct-fg)",
        padding: "10px 12px",
        borderRadius: 10,
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 680,
      }}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "Light" : "Night"}
    </button>
  );
}

