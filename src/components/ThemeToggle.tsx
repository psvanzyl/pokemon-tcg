"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type ThemeMode = "light" | "dark" | "system";

const KEY = "carddex-theme";

const OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: "light", label: "Light", Icon: Sun },
  { mode: "dark", label: "Dark", Icon: Moon },
  { mode: "system", label: "System", Icon: Monitor },
];

function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Apply a mode to <html>. Mirrors the inline script in layout.tsx. */
export function paint(mode: ThemeMode) {
  const dark = mode === "dark" || (mode === "system" && prefersDark());
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function readMode(): ThemeMode {
  const stored = window.localStorage.getItem(KEY);
  return stored === "dark" || stored === "system" ? stored : "light";
}

export default function ThemeToggle() {
  // SSR/first render is always "light"; the effect syncs to the stored mode.
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    setMode(readMode());
    // Follow the OS only while the choice is "system".
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readMode() === "system") paint("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const choose = (next: ThemeMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* private mode — the choice just will not persist */
    }
    paint(next);
  };

  return (
    <div
      role="group"
      aria-label="Colour theme"
      data-testid="theme-toggle"
      className="flex flex-none items-center gap-0.5 rounded-xl border border-line bg-panel p-0.5"
    >
      {OPTIONS.map(({ mode: m, label, Icon }) => (
        <button
          key={m}
          type="button"
          onClick={() => choose(m)}
          aria-pressed={mode === m}
          aria-label={`${label} theme`}
          title={`${label} theme`}
          data-testid={`theme-${m}`}
          className={`grid h-7 w-7 place-items-center rounded-[9px] transition ${
            mode === m ? "bg-raised text-fg" : "text-muted hover:text-fg"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
