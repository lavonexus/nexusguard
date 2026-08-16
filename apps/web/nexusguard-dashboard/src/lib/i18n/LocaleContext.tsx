"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Locale = "tr" | "en";

const STORAGE_KEY = "nexusguard.locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "tr",
  setLocale: () => {},
});

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "tr";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "en" ? "en" : "tr";
}

// Wraps <AppShell> from app/layout.tsx (not inside ServerProvider, which only mounts on
// the logged-in dashboard branch) - the landing/legal pages need locale too. Mirrors
// lib/session.ts's localStorage read/write shape.
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("tr");

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
