"use client";

import Link from "next/link";
import { DISCORD_PURCHASE_URL, type Plan } from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";

const TIERS: {
  plan: Plan;
  name: string;
  tagline: string;
  price: string;
  features: string[];
  highlight?: boolean;
}[] = [
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
    features: [
      "Sınırsız tarama",
      "Yapay zeka destekli risk özetleri",
      "Öncelikli destek",
      "1 yönetici hesabı",
    ],
  },
  {
    plan: "ProDuo",
    name: "PRO DUO",
    tagline: "İki yönetici",
    price: "₺1800/ay",
    features: [
      "PRO'daki her şey",
      "2 yönetici hesabı",
      "Sınırsız tarama",
    ],
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
];

export default function PricingPage() {
  const { session, server } = useServerContext();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-white">Fiyatlandırma</h1>
        <p className="mt-3 text-sm text-zinc-400">
          Satın alım Discord üzerinden ticket açarak yapılır - ödeme onaylandıktan sonra bir
          NexusGuard yöneticisi hesabına planı manuel olarak tanımlar.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier) => {
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
                  Önerilen
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
                  Giriş yap ve devam et
                </Link>
              ) : isCurrent ? (
                <div className="mt-6 rounded-md border border-zinc-800 px-4 py-2 text-center text-sm text-zinc-500">
                  Mevcut plan
                  {server?.planExpiresAt && (
                    <div className="mt-0.5 text-xs text-zinc-600">
                      Bitiş: {new Date(server.planExpiresAt).toLocaleDateString("tr-TR")}
                    </div>
                  )}
                </div>
              ) : tier.plan === "Free" ? (
                <div className="mt-6 rounded-md border border-zinc-800 px-4 py-2 text-center text-sm text-zinc-500">
                  Varsayılan plan
                </div>
              ) : (
                <a
                  href={DISCORD_PURCHASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-6 block rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
                    tier.highlight ? "bg-violet-600 text-white hover:bg-violet-500" : "border border-zinc-700 text-zinc-200 hover:border-zinc-600"
                  }`}
                >
                  Discord&apos;dan satın al
                </a>
              )}
            </div>
          );
        })}
      </div>

      <p className="mx-auto mt-8 max-w-xl text-center text-xs text-zinc-600">
        Ödeme Discord ticket sistemi üzerinden alınır - sitede kart bilgisi girilmez. Ticket
        onaylandıktan sonra planın, Discord kullanıcı adın veya Google e-postana bağlı hesabına
        tanımlanır.
      </p>
    </div>
  );
}
