"use client";

// Global theme state. Dark is the default; persists via localStorage.
// No page reload on toggle.
//
// Hydration-safe pattern using useSyncExternalStore:
// - During SSR and the initial client (hydration) render, React uses
//   getServerSnapshot → the deterministic default "dark", matching the
//   server HTML exactly. No hydration mismatch.
// - After hydration, React swaps to the client snapshot (readStoredTheme),
//   synchronizing with the persisted localStorage value and the data-theme
//   attribute already applied pre-hydration by the <head> script in
//   app/layout.tsx. No flash.
// - The toggle never reloads the page.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "qaguard-theme";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable (private mode, etc.) — fall through to dark.
  }
  return "dark";
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

// SSR/hydration snapshot: deterministic default so server and client match.
function getServerSnapshot(): Theme {
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribe,
    readStoredTheme,
    getServerSnapshot
  );

  // Apply the theme to <html> and persist whenever it changes.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage write failures.
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // Ignore storage write failures.
    }
    window.dispatchEvent(new Event("storage"));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
