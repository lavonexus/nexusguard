"use client";

import { useState } from "react";
import { useLocale, type Locale } from "@/lib/i18n/LocaleContext";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "tr", label: "Türkçe" },
  { value: "en", label: "English" },
];

// Used in both AppShell's marketing header and DashboardSidebar - one shared control so
// the two chrome surfaces never drift out of sync visually.
export default function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Dil / Language"
        className="flex items-center gap-1 rounded-full border border-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
      >
        <GlobeIcon className="h-3.5 w-3.5" />
        {locale.toUpperCase()}
        <ChevronDownIcon className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1.5 w-32 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 py-1 shadow-xl shadow-black/40">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setLocale(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${
                  locale === opt.value ? "text-violet-300" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                {opt.label}
                {locale === opt.value && <CheckIcon className="h-3 w-3" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
