"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { useServerContext } from "@/lib/serverContext";
import { clearSession } from "@/lib/session";
import { logout as apiLogout } from "@/lib/api";

const MAIN_LINKS = [
  { href: "/overview", label: "Genel Bakış" },
  { href: "/scans", label: "Tarama Geçmişi" },
  { href: "/leaderboard", label: "Lider Tablosu" },
  { href: "/team", label: "Kurumsal" },
];

const PLAN_LABEL: Record<string, string> = {
  Free: "Free",
  Pro: "Pro",
  ProDuo: "Pro Duo",
  Enterprise: "Enterprise",
};

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, server, user } = useServerContext();

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

      <div className="flex items-center gap-2 px-5 py-5">
        <Logo className="h-6 w-6" />
        <span className="font-semibold tracking-tight text-white">NexusGuard</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        <div className="px-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">Ana</div>
        <div className="mt-1 space-y-0.5">
          {MAIN_LINKS.map((link) => {
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
                    PRO
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">Araçlar</div>
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
            Mağaza
          </Link>
        </div>

        <div className="mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">Diğer</div>
        <div className="mt-1 space-y-0.5">
          <Link
            href="/settings"
            className={`block rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
              pathname === "/settings" ? "bg-violet-500/10 text-white ring-1 ring-inset ring-violet-500/20" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            Ayarlar
          </Link>
        </div>

        {user?.isSiteAdmin && (
          <>
            <div className="mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">Yönetim</div>
            <div className="mt-1 space-y-0.5">
              <Link
                href="/admin"
                className={`flex items-center justify-between rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                  pathname === "/admin" ? "bg-violet-500/10 text-white ring-1 ring-inset ring-violet-500/20" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                Yönetici Paneli
                <span className="rounded border border-amber-800/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                  ADMIN
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
            <div className="text-xs font-semibold text-violet-300">Enterprise&apos;a yükselt</div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Sunucuna birden fazla yönetici ekle, ekip halinde yönet.
            </p>
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
                <span className="text-zinc-600"> · {new Date(server.planExpiresAt).toLocaleDateString("tr-TR")}&apos;a kadar</span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-1 flex flex-col gap-1 px-2">
          <button
            onClick={handleSwitchServer}
            className="whitespace-nowrap rounded-md border border-white/10 px-2 py-1 text-left text-xs text-zinc-400 transition-colors hover:border-violet-800/50 hover:text-zinc-200"
          >
            Sunucu değiştir
          </button>
          <button
            onClick={handleLogout}
            className="whitespace-nowrap rounded-md border border-white/10 px-2 py-1 text-left text-xs text-zinc-400 transition-colors hover:border-violet-800/50 hover:text-zinc-200"
          >
            Çıkış yap
          </button>
        </div>
      </div>
    </aside>
  );
}
