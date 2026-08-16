"use client";

import Link from "next/link";
import { DISCORD_PURCHASE_URL, type Plan } from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useT, type Dict } from "@/lib/i18n/useT";

interface Tier {
  plan: Plan;
  name: string;
  tagline: string;
  price: string;
  features: string[];
  highlight?: boolean;
}

const TIERS: Dict<Tier[]> = {
  tr: [
    {
      plan: "Free",
      name: "Free",
      tagline: "Başlangıç için",
      price: "₺0",
      features: [
        "Günde 1 tarama hakkı",
        "Server-side Detection Engine",
        "YARA imza taraması",
        "Discord bot entegrasyonu",
        "1 yönetici hesabı",
      ],
    },
    {
      plan: "Pro",
      name: "PRO",
      tagline: "Tek kişilik yönetim",
      price: "₺1000/ay",
      features: ["Sınırsız tarama", "Yapay zeka destekli risk özetleri", "Öncelikli destek", "1 yönetici hesabı"],
    },
    {
      plan: "ProDuo",
      name: "PRO DUO",
      tagline: "İki yönetici",
      price: "₺1800/ay",
      features: ["PRO'daki her şey", "2 yönetici hesabı", "Sınırsız tarama"],
    },
    {
      plan: "Enterprise",
      name: "ENTERPRISE",
      tagline: "10 ya da 15 kişilik ekipler",
      price: "₺5000 - ₺6000/ay",
      features: [
        "PRO'daki her şey",
        "10 kişilik: ₺5000/ay · 15 kişilik: ₺6000/ay",
        "Kurumsal ekip yönetim paneli",
        "Üye ekle/çıkar (Kurumsal sayfası)",
      ],
      highlight: true,
    },
  ],
  en: [
    {
      plan: "Free",
      name: "Free",
      tagline: "To get started",
      price: "₺0",
      features: [
        "1 scan a day",
        "Server-side Detection Engine",
        "YARA signature scanning",
        "Discord bot integration",
        "1 admin account",
      ],
    },
    {
      plan: "Pro",
      name: "PRO",
      tagline: "Single-admin management",
      price: "₺1000/mo",
      features: ["Unlimited scans", "AI-powered risk summaries", "Priority support", "1 admin account"],
    },
    {
      plan: "ProDuo",
      name: "PRO DUO",
      tagline: "Two admins",
      price: "₺1800/mo",
      features: ["Everything in PRO", "2 admin accounts", "Unlimited scans"],
    },
    {
      plan: "Enterprise",
      name: "ENTERPRISE",
      tagline: "Teams of 10 or 15",
      price: "₺5000 - ₺6000/mo",
      features: [
        "Everything in PRO",
        "10 seats: ₺5000/mo · 15 seats: ₺6000/mo",
        "Enterprise team management panel",
        "Add/remove members (Enterprise page)",
      ],
      highlight: true,
    },
  ],
};

const STRINGS: Dict<{
  title: string;
  subtitle: string;
  recommended: string;
  loginContinue: string;
  currentPlan: string;
  endsOn: string;
  defaultPlan: string;
  buyOnDiscord: string;
  footnote: string;
}> = {
  tr: {
    title: "Fiyatlandırma",
    subtitle:
      "Satın alım Discord üzerinden ticket açarak yapılır - ödeme onaylandıktan sonra bir NexusGuard yöneticisi hesabına planı manuel olarak tanımlar.",
    recommended: "Önerilen",
    loginContinue: "Giriş yap ve devam et",
    currentPlan: "Mevcut plan",
    endsOn: "Bitiş",
    defaultPlan: "Varsayılan plan",
    buyOnDiscord: "Discord'dan satın al",
    footnote:
      "Ödeme Discord ticket sistemi üzerinden alınır - sitede kart bilgisi girilmez. Ticket onaylandıktan sonra planın, Discord kullanıcı adın veya Google e-postana bağlı hesabına tanımlanır.",
  },
  en: {
    title: "Pricing",
    subtitle:
      "Purchases go through a Discord ticket - once payment is confirmed, a NexusGuard admin applies the plan to your account by hand.",
    recommended: "Recommended",
    loginContinue: "Log in and continue",
    currentPlan: "Current plan",
    endsOn: "Ends",
    defaultPlan: "Default plan",
    buyOnDiscord: "Buy on Discord",
    footnote:
      "Payment is taken through the Discord ticket system - no card details are entered on the site. Once the ticket is confirmed, the plan is applied to the account linked to your Discord username or Google email.",
  },
};

export default function PricingPage() {
  const { session, server } = useServerContext();
  const { locale } = useLocale();
  const tiers = useT(TIERS);
  const t = useT(STRINGS);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-white">{t.title}</h1>
        <p className="mt-3 text-sm text-zinc-400">{t.subtitle}</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier) => {
          const isCurrent = session && server?.plan === tier.plan;
          return (
            <div
              key={tier.plan}
              className={`flex flex-col rounded-2xl border p-6 ${
                tier.highlight ? "border-violet-600 bg-gradient-to-b from-violet-950/30 to-transparent" : "border-zinc-800 bg-zinc-900/30"
              }`}
            >
              {tier.highlight && (
                <span className="mb-3 inline-block w-fit rounded-full bg-violet-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {t.recommended}
                </span>
              )}
              <h2 className="text-lg font-semibold text-white">{tier.name}</h2>
              <p className="mt-1 text-xs text-zinc-500">{tier.tagline}</p>
              <div className="mt-4 text-2xl font-semibold text-white">{tier.price}</div>

              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-zinc-300">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-violet-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {!session ? (
                <Link
                  href="/setup"
                  className="mt-6 block rounded-md border border-zinc-700 px-4 py-2 text-center text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600"
                >
                  {t.loginContinue}
                </Link>
              ) : isCurrent ? (
                <div className="mt-6 rounded-md border border-zinc-800 px-4 py-2 text-center text-sm text-zinc-500">
                  {t.currentPlan}
                  {server?.planExpiresAt && (
                    <div className="mt-0.5 text-xs text-zinc-600">
                      {t.endsOn}: {new Date(server.planExpiresAt).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR")}
                    </div>
                  )}
                </div>
              ) : tier.plan === "Free" ? (
                <div className="mt-6 rounded-md border border-zinc-800 px-4 py-2 text-center text-sm text-zinc-500">{t.defaultPlan}</div>
              ) : (
                <a
                  href={DISCORD_PURCHASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-6 block rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
                    tier.highlight ? "bg-violet-600 text-white hover:bg-violet-500" : "border border-zinc-700 text-zinc-200 hover:border-zinc-600"
                  }`}
                >
                  {t.buyOnDiscord}
                </a>
              )}
            </div>
          );
        })}
      </div>

      <p className="mx-auto mt-8 max-w-xl text-center text-xs text-zinc-600">{t.footnote}</p>
    </div>
  );
}
