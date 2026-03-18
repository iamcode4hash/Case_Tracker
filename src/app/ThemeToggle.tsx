"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/app/ui.module.css";

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
      className={styles.themeButton}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "Light" : "Night"}
    </button>
  );
}
