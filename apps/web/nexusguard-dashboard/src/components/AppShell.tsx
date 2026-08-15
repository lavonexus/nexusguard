"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { loadSession, type ServerSession } from "@/lib/session";
import { ServerProvider } from "@/lib/serverContext";
import Logo from "@/components/Logo";
import DashboardSidebar from "@/components/DashboardSidebar";

const MARKETING_LINKS = [
  { href: "#features", label: "Özellikler" },
  { href: "#how-it-works", label: "Nasıl çalışır" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<ServerSession | null>(null);

  useEffect(() => {
    setSession(loadSession());
  }, [pathname]);

  const isLanding = pathname === "/";
  const isSetup = pathname === "/setup";

  if (isLanding) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
        <header className="sticky top-0 z-20 border-b border-white/5 bg-zinc-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <Logo className="h-6 w-6" />
              NexusGuard
            </Link>

            <nav className="hidden items-center gap-6 sm:flex">
              {MARKETING_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="text-sm text-zinc-400 transition-colors hover:text-zinc-200">
                  {link.label}
                </a>
              ))}
              <Link href="/pricing" className="text-sm text-zinc-400 transition-colors hover:text-zinc-200">
                Fiyatlandırma
              </Link>
            </nav>

            <Link
              href={session ? "/overview" : "/setup"}
              className="rounded-md bg-violet-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
            >
              {session ? "Dashboard'a git" : "Ücretsiz başla"}
            </Link>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-zinc-500">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <span className="flex items-center gap-2">
              <Logo className="h-4 w-4" />
              NexusGuard
            </span>
            <span>FiveM için sunucu taraflı hile tespiti. Scanner&apos;ın raporladığı hiçbir şeye, sunucu doğrulamadan güvenilmez.</span>
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
