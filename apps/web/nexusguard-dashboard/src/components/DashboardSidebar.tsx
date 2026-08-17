"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useServerContext } from "@/lib/serverContext";
import { clearSession } from "@/lib/session";
import { logout as apiLogout } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useT, type Dict } from "@/lib/i18n/useT";

const MAIN_LINKS: Dict<{ href: string; label: string }[]> = {
  tr: [
    { href: "/overview", label: "Genel Bakış" },
    { href: "/scans", label: "Tarama Geçmişi" },
    { href: "/leaderboard", label: "Lider Tablosu" },
    { href: "/team", label: "Kurumsal" },
  ],
  en: [
    { href: "/overview", label: "Overview" },
    { href: "/scans", label: "Scan History" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/team", label: "Enterprise" },
  ],
};

const PLAN_LABEL: Record<string, string> = {
  Free: "Free",
  Pro: "Pro",
  ProDuo: "Professional",
  Enterprise: "Enterprise",
};

const STRINGS: Dict<{
  sectionMain: string;
  sectionTools: string;
  sectionOther: string;
  sectionSupport: string;
  sectionAdmin: string;
  marketplace: string;
  settings: string;
  tickets: string;
  adminPanel: string;
  adminBadge: string;
  proBadge: string;
  upgradeTitle: string;
  upgradeBody: string;
  switchServer: string;
  returnHome: string;
  logout: string;
}> = {
  tr: {
    sectionMain: "Ana",
    sectionTools: "Araçlar",
    sectionOther: "Diğer",
    sectionSupport: "Destek",
    sectionAdmin: "Yönetim",
    marketplace: "Mağaza",
    settings: "Ayarlar",
    tickets: "Biletlerim",
    adminPanel: "Yönetici Paneli",
    adminBadge: "ADMIN",
    proBadge: "PRO",
    upgradeTitle: "Enterprise'a yükselt",
    upgradeBody: "Sunucuna birden fazla yönetici ekle, ekip halinde yönet.",
    switchServer: "Sunucu değiştir",
    returnHome: "Ana sayfaya dön",
    logout: "Çıkış yap",
  },
  en: {
    sectionMain: "Main",
    sectionTools: "Tools",
    sectionOther: "Other",
    sectionSupport: "Support",
    sectionAdmin: "Admin",
    marketplace: "Marketplace",
    settings: "Settings",
    tickets: "My Tickets",
    adminPanel: "Admin Panel",
    adminBadge: "ADMIN",
    proBadge: "PRO",
    upgradeTitle: "Upgrade to Enterprise",
    upgradeBody: "Add multiple admins to your server and manage it as a team.",
    switchServer: "Switch server",
    returnHome: "Return to home",
    logout: "Log out",
  },
};

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, server, user } = useServerContext();
  const { locale } = useLocale();
  const mainLinks = useT(MAIN_LINKS);
  const t = useT(STRINGS);

  async function handleLogout() {
    clearSession();
    try {
      await apiLogout();
    } catch {
      // Cookie may already be gone - not worth blocking on.
    }
    router.push("/setup");
  }

  function handleSwitchServer() {
    clearSession();
    router.push("/setup");
  }

  const plan = server?.plan ?? "Free";
  const initial = session?.serverName?.trim().charAt(0).toUpperCase() || "N";

  return (
    <aside className="sidebar-stars relative flex h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-violet-950/40">
      <div className="pointer-events-none absolute -left-16 -top-24 -z-10 h-56 w-56 rounded-full bg-violet-700/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/2 -z-10 h-48 w-48 -translate-x-1/2 rounded-full bg-violet-900/10 blur-3xl" />

      <div className="flex items-center justify-between gap-2 px-5 py-5">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-semibold tracking-tight text-white">NexusGuard</span>
        </div>
        <LanguageSwitcher />
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        <div className="px-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">{t.sectionMain}</div>
        <div className="mt-1 space-y-0.5">
          {mainLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-violet-500/10 text-white ring-1 ring-inset ring-violet-500/20" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                {link.label}
                {link.href === "/team" && plan !== "Enterprise" && (
                  <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                    {t.proBadge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">{t.sectionTools}</div>
        <div className="mt-1 space-y-0.5">
          <Link
            href="/tool-designer"
            className={`block rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
              pathname === "/tool-designer" ? "bg-violet-500/10 text-white ring-1 ring-inset ring-violet-500/20" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            Tool Designer
          </Link>
          <Link
            href="/marketplace"
            className={`block rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
              pathname === "/marketplace" || pathname.startsWith("/marketplace/")
                ? "bg-zinc-900 text-white"
                : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
            }`}
          >
            {t.marketplace}
          </Link>
        </div>

        <div className="mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">{t.sectionOther}</div>
        <div className="mt-1 space-y-0.5">
          <Link
            href="/settings"
            className={`block rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
              pathname === "/settings" ? "bg-violet-500/10 text-white ring-1 ring-inset ring-violet-500/20" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            {t.settings}
          </Link>
        </div>

        <div className="mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">{t.sectionSupport}</div>
        <div className="mt-1 space-y-0.5">
          <Link
            href="/tickets"
            className={`block rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
              pathname === "/tickets" ? "bg-violet-500/10 text-white ring-1 ring-inset ring-violet-500/20" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            {t.tickets}
          </Link>
        </div>

        {user?.isSiteAdmin && (
          <>
            <div className="mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">{t.sectionAdmin}</div>
            <div className="mt-1 space-y-0.5">
              <Link
                href="/admin"
                className={`flex items-center justify-between rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                  pathname === "/admin" ? "bg-violet-500/10 text-white ring-1 ring-inset ring-violet-500/20" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                {t.adminPanel}
                <span className="rounded border border-amber-800/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                  {t.adminBadge}
                </span>
              </Link>
            </div>
          </>
        )}

        {plan !== "Enterprise" && (
          <Link
            href="/pricing"
            className="mt-6 block rounded-lg border border-violet-900/50 bg-gradient-to-b from-violet-950/40 to-transparent p-3 transition-colors hover:border-violet-700/60"
          >
            <div className="text-xs font-semibold text-violet-300">{t.upgradeTitle}</div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{t.upgradeBody}</p>
          </Link>
        )}
      </nav>

      <div className="border-t border-violet-950/40 p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-sm font-semibold text-violet-300 ring-1 ring-inset ring-violet-500/20">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-zinc-200">{session?.serverName ?? "—"}</div>
            <div className="text-xs text-zinc-500">
              {PLAN_LABEL[plan] ?? plan}
              {server?.planExpiresAt && (
                <span className="text-zinc-600">
                  {" "}
                  ·{" "}
                  {locale === "en"
                    ? `until ${new Date(server.planExpiresAt).toLocaleDateString("en-US")}`
                    : `${new Date(server.planExpiresAt).toLocaleDateString("tr-TR")}'a kadar`}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mx-2 my-2 h-px bg-white/5" />

        <div className="space-y-0.5 px-1">
          {plan === "Enterprise" && (
            <button
              onClick={handleSwitchServer}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
            >
              <SwitchServerIcon className="h-3.5 w-3.5 shrink-0" />
              {t.switchServer}
            </button>
          )}
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
          >
            <HomeIcon className="h-3.5 w-3.5 shrink-0" />
            {t.returnHome}
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
          >
            <LogoutIcon className="h-3.5 w-3.5 shrink-0" />
            {t.logout}
          </button>
        </div>
      </div>
    </aside>
  );
}

function SwitchServerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 7h13l-3-3m3 3-3 3M21 17H8l3 3m-3-3 3-3" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
