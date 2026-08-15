"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadSession, type ServerSession } from "@/lib/session";
import { DISCORD_PURCHASE_URL } from "@/lib/api";
import HeroBackdrop from "@/components/HeroBackdrop";
import DashboardPreview from "@/components/DashboardPreview";

const FEATURES = [
  {
    title: "Sunucu asla istemciye güvenmez",
    desc: "Scanner.exe sadece ham veri gönderir - process listesi, yüklü modüller, dosya listeleri. \"Şüpheli mi değil mi\" kararını her zaman sunucudaki Detection Engine verir.",
  },
  {
    title: "YARA imza taraması",
    desc: "Adayı gösteren her exe/dll, sunucu tarafında gerçek YARA kurallarıyla taranır. Dosya baytları hiçbir zaman diskte kalıcı olarak saklanmaz.",
  },
  {
    title: "Discord'da yerli",
    desc: "/nexusguard-scan komutuyla oyuncuya PIN'i doğrudan DM olarak gönder. Sonuçlar aynı sunucudaki dashboard'a düşer.",
  },
  {
    title: "Tek tıkla paylaşılabilir link",
    desc: "Yeni tarama oluşturunca PIN'i içinde barındıran bir indirme linki üretilir. Oyuncu exe'yi açtığında PIN kendiliğinden dolar.",
  },
  {
    title: "Yapay zeka destekli özet",
    desc: "Tespit edilen bulgular, moderatörün hızlıca okuyabileceği kısa bir risk özetine dönüştürülür.",
  },
  {
    title: "Gerçek zamanlı risk skoru",
    desc: "Her tespitin bir ağırlığı vardır; sunucu bunları toplayıp 0-100 arası tek bir risk skoruna indirger.",
  },
];

const PACKAGES: {
  name: string;
  tagline: string;
  price: string;
  period: string;
  features: string[];
  highlight?: boolean;
}[] = [
  {
    name: "PRO",
    tagline: "Tek kişilik yönetim",
    price: "₺1000",
    period: "/ay",
    features: ["Sınırsız tarama", "Yapay zeka destekli risk özetleri", "1 yönetici hesabı"],
  },
  {
    name: "PRO DUO",
    tagline: "İki yönetici",
    price: "₺1800",
    period: "/ay",
    features: ["PRO'daki her şey", "2 yönetici hesabı", "Sınırsız tarama"],
  },
  {
    name: "ENTERPRISE",
    tagline: "10 kişilik ekip",
    price: "₺5000",
    period: "/ay",
    features: ["PRO'daki her şey", "10 kişilik ekip yönetimi", "Kurumsal ekip paneli"],
    highlight: true,
  },
  {
    name: "ENTERPRISE",
    tagline: "15 kişilik ekip",
    price: "₺6000",
    period: "/ay",
    features: ["PRO'daki her şey", "15 kişilik ekip yönetimi", "Kurumsal ekip paneli"],
  },
];

const STEPS = [
  {
    n: "1",
    title: "Tarama oluştur",
    desc: "Dashboard'da \"New scan\" de, oyuncu adını gir. PIN'i içinde barındıran bir indirme linki hazır olur.",
  },
  {
    n: "2",
    title: "Linki gönder",
    desc: "Linki oyuncuya Discord'dan ya da başka bir kanaldan ilet - istersen bot otomatik DM de atabilir.",
  },
  {
    n: "3",
    title: "Oyuncu açar, PIN kendiliğinden girilir",
    desc: "Scanner.exe açılınca PIN otomatik dolar ve tarama görsel bir ilerleme çubuğuyla başlar.",
  },
  {
    n: "4",
    title: "Sonuç dashboard'a düşer",
    desc: "Risk skoru, tespitler ve varsa yapay zeka özeti anında dashboard'da görünür.",
  },
];

export default function Home() {
  const [session, setSession] = useState<ServerSession | null>(null);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  const primaryHref = session ? "/overview" : "/setup";
  const primaryLabel = session ? "Dashboard'a git" : "Ücretsiz başla";

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden px-6 pb-16 pt-20 sm:pt-28">
        <HeroBackdrop />
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs font-medium text-zinc-400">
            ✦ NexusGuard ile tanışın
          </span>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Yakalanamayanı
            <br />
            yakalamak için.
          </h1>
          <p className="mt-5 max-w-xl text-balance text-base text-zinc-400 sm:text-lg">
            NexusGuard, oyuncunun bilgisayarından yalnızca ham veri toplayan otomatik bir tarama
            aracıdır - process, modül ve dosya analiziyle, sunucu tarafında hesaplanan gerçek
            zamanlı raporlarla.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={primaryHref}
              className="flex items-center gap-1.5 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
            >
              {primaryLabel} →
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/60 px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600"
            >
              Nasıl çalışır?
            </a>
          </div>
        </div>

        <div className="relative mt-16 px-4">
          <DashboardPreview />
        </div>
      </section>

      {/* Feature chips */}
      <section className="border-y border-white/5 bg-zinc-950/60 px-6 py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
          <span>Ham veri toplama</span>
          <span>Server-side Detection Engine</span>
          <span>YARA taraması</span>
          <span>Discord bot</span>
          <span>Yapay zeka özeti</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">
            Neler yapar?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-zinc-400">
            Her özellik gerçek: bu sayfanın altında çalışan API, Detection Engine ve Scanner.exe
            tarafından karşılanıyor.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 transition-colors hover:border-violet-800/60"
              >
                <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">
            Nasıl çalışır?
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-sm font-semibold text-violet-300">
                  {s.n}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">
            Paketler
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-zinc-400">
            Free planda günde 1 tarama hakkı var. Daha fazlası için Discord&apos;dan ticket
            açarak satın al - ödeme onaylandıktan sonra planın hesabına tanımlanır.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PACKAGES.map((pkg, i) => (
              <div
                key={`${pkg.name}-${pkg.tagline}-${i}`}
                className={`flex flex-col rounded-2xl border p-6 ${
                  pkg.highlight
                    ? "border-violet-600 bg-gradient-to-b from-violet-950/30 to-transparent"
                    : "border-zinc-800 bg-zinc-900/40"
                }`}
              >
                {pkg.highlight && (
                  <span className="mb-3 inline-block w-fit rounded-full bg-violet-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Önerilen
                  </span>
                )}
                <h3 className="text-sm font-semibold tracking-wide text-white">{pkg.name}</h3>
                <p className="mt-1 text-xs text-zinc-500">{pkg.tagline}</p>
                <div className="mt-4 text-2xl font-semibold text-white">
                  {pkg.price}
                  <span className="text-sm font-normal text-zinc-500">{pkg.period}</span>
                </div>

                <ul className="mt-6 flex-1 space-y-2 text-sm text-zinc-300">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-0.5 text-violet-400">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href={DISCORD_PURCHASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-6 block rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
                    pkg.highlight
                      ? "bg-violet-600 text-white hover:bg-violet-500"
                      : "border border-zinc-700 text-zinc-200 hover:border-zinc-600"
                  }`}
                >
                  Satın Al
                </a>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-lg text-center text-xs text-zinc-600">
            Sitede kart bilgisi alınmaz - satın alım Discord ticket sistemi üzerinden yapılır.
            &quot;Satın Al&quot;a basınca Discord sunucumuza yönlendirilirsin.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-violet-900/40 bg-gradient-to-b from-violet-950/30 to-transparent px-8 py-12 text-center">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Sunucunu birkaç dakikada koru
          </h2>
          <p className="mt-3 max-w-md text-sm text-zinc-400">
            Discord ile giriş yap, sunucunu ekle, ilk taramanı oluştur. Kurulum için .NET veya
            sunucu yönetimi bilgisi gerekmiyor.
          </p>
          <Link
            href={primaryHref}
            className="mt-6 rounded-md bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            {primaryLabel}
          </Link>
        </div>
      </section>
    </div>
  );
}
