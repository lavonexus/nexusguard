"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DISCORD_PURCHASE_URL } from "@/lib/api";
import { loadSession, type ServerSession } from "@/lib/session";
import { ServerProvider } from "@/lib/serverContext";
import Logo from "@/components/Logo";
import DashboardSidebar from "@/components/DashboardSidebar";

const MARKETING_LINKS = [
  { href: "/#features", label: "Özellikler" },
  { href: "/pricing", label: "Fiyatlar" },
  { href: "/faq", label: "SSS" },
  { href: "/terms", label: "Koşullar" },
  { href: "/privacy", label: "Gizlilik" },
  { href: "/refund", label: "İade" },
  { href: "/partner", label: "Partner" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<ServerSession | null>(null);

  useEffect(() => {
    setSession(loadSession());
  }, [pathname]);

  const isLanding = pathname === "/";
  const isSetup = pathname === "/setup";
  const isPublicContentPage = ["/faq", "/terms", "/privacy", "/refund", "/partner"].includes(pathname);

  if (isLanding || isPublicContentPage) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
        <header className="sticky top-0 z-20 border-b border-white/5 bg-zinc-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
            <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
              <Logo className="h-6 w-6" />
              NexusGuard
            </Link>

            <nav className="hidden items-center gap-5 lg:flex">
              {MARKETING_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm text-zinc-400 transition-colors hover:text-zinc-200">
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-3">
              <a
                href={DISCORD_PURCHASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                title="Discord"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
              >
                <DiscordIcon className="h-4 w-4" />
              </a>

              <button
                type="button"
                title="Dil (yalnızca Türkçe mevcut)"
                className="hidden items-center gap-1 rounded-full border border-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-400 sm:flex"
              >
                <GlobeIcon className="h-3.5 w-3.5" />
                TR
                <ChevronDownIcon className="h-3 w-3" />
              </button>

              <Link
                href={session ? "/overview" : "/setup"}
                className="rounded-full bg-violet-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
              >
                Panel
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-white/5 px-6 py-8 text-xs text-zinc-500">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <span className="flex items-center gap-2">
              <Logo className="h-4 w-4" />
              NexusGuard
            </span>
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              {MARKETING_LINKS.slice(2).map((link) => (
                <Link key={link.href} href={link.href} className="transition-colors hover:text-zinc-300">
                  {link.label}
                </Link>
              ))}
            </nav>
            <span className="text-center sm:text-right">
              FiveM için sunucu taraflı hile tespiti. Scanner&apos;ın raporladığı hiçbir şeye, sunucu doğrulamadan güvenilmez.
            </span>
          </div>
        </footer>
      </div>
    );
  }

  if (isSetup) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800">
          <div className="mx-auto flex max-w-5xl items-center px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <Logo className="h-6 w-6" />
              NexusGuard
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
      </div>
    );
  }

  // Pricing is reachable both logged-out (marketing) and logged-in (upgrade), so it gets the
  // plain centered layout too rather than requiring a session for the sidebar chrome.
  if (pathname === "/pricing" && !session) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <Logo className="h-6 w-6" />
              NexusGuard
            </Link>
            <Link href="/setup" className="rounded-md bg-violet-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-violet-500">
              Ücretsiz başla
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <ServerProvider>
      <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
        <DashboardSidebar />
        <main className="min-w-0 flex-1 overflow-y-auto px-8 py-8">{children}</main>
      </div>
    </ServerProvider>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.32 5.37a18.5 18.5 0 0 0-4.6-1.43.07.07 0 0 0-.08.04c-.2.36-.42.82-.57 1.19a17.1 17.1 0 0 0-5.14 0 12 12 0 0 0-.58-1.19.07.07 0 0 0-.08-.04c-1.6.28-3.14.76-4.6 1.43a.07.07 0 0 0-.03.03C1.6 9.6.87 13.7 1.23 17.76a.08.08 0 0 0 .03.05 18.6 18.6 0 0 0 5.6 2.83.07.07 0 0 0 .08-.03c.43-.59.82-1.22 1.14-1.87a.07.07 0 0 0-.04-.1 12.3 12.3 0 0 1-1.76-.84.07.07 0 0 1-.01-.12c.12-.09.24-.18.35-.27a.07.07 0 0 1 .07-.01c3.7 1.69 7.7 1.69 11.36 0a.07.07 0 0 1 .07.01c.11.09.23.18.35.27a.07.07 0 0 1-.01.12c-.56.33-1.15.6-1.76.84a.07.07 0 0 0-.04.1c.33.65.72 1.28 1.14 1.87a.07.07 0 0 0 .08.03 18.5 18.5 0 0 0 5.61-2.83.07.07 0 0 0 .03-.05c.44-4.7-.73-8.77-3.08-12.36a.06.06 0 0 0-.03-.03ZM8.68 15.3c-1.11 0-2.03-1.02-2.03-2.27s.9-2.27 2.03-2.27c1.14 0 2.05 1.03 2.03 2.27 0 1.25-.9 2.27-2.03 2.27Zm6.65 0c-1.11 0-2.03-1.02-2.03-2.27s.9-2.27 2.03-2.27c1.14 0 2.05 1.03 2.03 2.27 0 1.25-.89 2.27-2.03 2.27Z" />
    </svg>
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
