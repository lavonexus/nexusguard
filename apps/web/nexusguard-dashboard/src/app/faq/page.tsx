"use client";

import { useState } from "react";
import Link from "next/link";
import { DISCORD_PURCHASE_URL } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleContext";

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

const FAQS_TR: FaqItem[] = [
  {
    q: "NexusGuard tam olarak ne yapıyor?",
    a: (
      <>
        Oyuncunun bilgisayarında ham veri toplayan bir Scanner uygulaması çalıştırıyorsun;
        toplanan veriyi &quot;hile mi değil mi&quot; diye değerlendiren kısım her zaman sunucu
        tarafındaki Detection Engine&apos;dir. Scanner&apos;a hiçbir zaman güvenmeyiz - o
        yalnızca ne gördüğünü raporlar.
      </>
    ),
  },
  {
    q: "Scanner gizlice mi çalışır?",
    a: (
      <>
        Hayır. Scanner, oyuncuya bir PIN girdikten sonra görünür bir ilerleme ekranıyla
        çalışır; oyuncu tam olarak ne zaman tarandığını bilir. Arka planda sessizce çalışan
        bir mod yoktur.
      </>
    ),
  },
  {
    q: "Taranan oyuncu kendi risk skorunu görebilir mi?",
    a: (
      <>
        Hayır, risk skoru ve tespit detayları yalnızca ilgili sunucunun yöneticilerine ve
        yetkili ekip üyelerine gösterilir. Oyuncu ekranında tamamlandı bilgisi dışında bir şey
        görünmez.
      </>
    ),
  },
  {
    q: "Free planda ne kadar tarama yapabilirim?",
    a: <>Free plan günde 1 tarama hakkı içerir. Daha fazlası için Fiyatlar sayfasındaki paketlere bakabilirsin.</>,
  },
  {
    q: "Nasıl satın alırım, sitede kartla ödeme var mı?",
    a: (
      <>
        Sitede kart bilgisi alınmıyor. Satın alım{" "}
        <a href={DISCORD_PURCHASE_URL} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
          Discord sunucumuzda
        </a>{" "}
        açtığın bir talep üzerinden yapılır; ödeme onaylandıktan sonra bir yönetici planını
        hesabına tanımlar.
      </>
    ),
  },
  {
    q: "Enterprise planda kaç kişi ekleyebilirim?",
    a: (
      <>
        Enterprise, 10 kişilik ve 15 kişilik olarak iki seçenekte satılır (sahip dahil). Sunucu
        sahibi, Kurumsal sayfasından Discord kullanıcı adıyla ekip arkadaşı ekleyip
        çıkarabilir; kontenjan dolduğunda yeni ekleme engellenir.
      </>
    ),
  },
  {
    q: "Scanner'ı çalıştırdığımda antivirüs/Windows Defender uyarı veriyor, güvenli mi?",
    a: (
      <>
        Scanner, sistem süreçlerini ve dosyalarını taradığı için bazı antivirüs yazılımları
        temkinli davranıp bir uyarı gösterebilir - bu, kod imzası henüz üçüncü taraf bir
        sertifika otoritesinden onaylanmadığı için oluşan yaygın bir durumdur, kötü amaçlı
        yazılım anlamına gelmez. Yine de Scanner&apos;ı yalnızca kendi sunucu yöneticinin
        verdiği resmi bağlantıdan indirmelisin.
      </>
    ),
  },
  {
    q: "Verilerim ne kadar süre saklanıyor?",
    a: (
      <>
        Tarama sonuçları, ilgili hesap ve sunucu aktif olduğu sürece saklanır. Ayrıntılar için{" "}
        <Link href="/privacy" className="text-violet-400 hover:underline">
          Gizlilik Politikası
        </Link>
        &apos;na bakabilirsin.
      </>
    ),
  },
  {
    q: "İade alabilir miyim?",
    a: (
      <>
        Belirli koşullar altında evet - detaylar{" "}
        <Link href="/refund" className="text-violet-400 hover:underline">
          İade Politikası
        </Link>{" "}
        sayfasında.
      </>
    ),
  },
  {
    q: "Discord botunu sunucuma nasıl eklerim?",
    a: (
      <>
        Discord botu, oyuncuya PIN&apos;i doğrudan DM olarak göndermek için kullanılır. Kurulum
        adımları için Discord sunucumuzdan bize ulaşman yeterli.
      </>
    ),
  },
];

const FAQS_EN: FaqItem[] = [
  {
    q: "What exactly does NexusGuard do?",
    a: (
      <>
        You run a Scanner application that collects raw data on the player's computer; the part
        that decides "cheating or not" is always the server-side Detection Engine. The Scanner
        is never trusted - it only reports what it saw.
      </>
    ),
  },
  {
    q: "Does the Scanner run secretly?",
    a: (
      <>
        No. The Scanner runs with a visible progress screen once the player enters a PIN; the
        player knows exactly when they're being scanned. There's no mode that runs silently in
        the background.
      </>
    ),
  },
  {
    q: "Can the scanned player see their own risk score?",
    a: (
      <>
        No, the risk score and detection details are only shown to that server's admins and
        authorized team members. The player's screen shows nothing beyond a "completed" message.
      </>
    ),
  },
  {
    q: "How many scans can I run on the Free plan?",
    a: <>The Free plan includes 1 scan a day. For more, check the packages on the Pricing page.</>,
  },
  {
    q: "How do I buy it - is there card payment on the site?",
    a: (
      <>
        No card details are collected on the site. Purchases go through a ticket you open on{" "}
        <a href={DISCORD_PURCHASE_URL} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
          our Discord server
        </a>
        ; once payment is confirmed, an admin applies the plan to your account.
      </>
    ),
  },
  {
    q: "How many people can I add on the Enterprise plan?",
    a: (
      <>
        Enterprise is sold in two tiers: 10 seats and 15 seats (owner included). The server owner
        can add or remove teammates by their Discord username from the Enterprise page; new
        additions are blocked once the seat count is full.
      </>
    ),
  },
  {
    q: "My antivirus/Windows Defender warns when I run the Scanner - is it safe?",
    a: (
      <>
        Since the Scanner inspects system processes and files, some antivirus software plays it
        safe and shows a warning - this is common when a code signature isn't yet approved by a
        third-party certificate authority, and it doesn't mean malware. Still, only ever download
        the Scanner from the official link your own server admin gave you.
      </>
    ),
  },
  {
    q: "How long is my data kept?",
    a: (
      <>
        Scan results are kept for as long as the associated account and server remain active. See
        the{" "}
        <Link href="/privacy" className="text-violet-400 hover:underline">
          Privacy Policy
        </Link>{" "}
        for details.
      </>
    ),
  },
  {
    q: "Can I get a refund?",
    a: (
      <>
        Yes, under certain conditions - see the{" "}
        <Link href="/refund" className="text-violet-400 hover:underline">
          Refund Policy
        </Link>{" "}
        page for details.
      </>
    ),
  },
  {
    q: "How do I add the Discord bot to my server?",
    a: (
      <>
        The Discord bot is used to send the player their PIN directly as a DM. Just reach out to
        us on our Discord server for setup steps.
      </>
    ),
  },
];

const STRINGS = {
  tr: { title: "Sıkça Sorulan Sorular", subtitle: "Aradığını bulamazsan Discord sunucumuzdan bize doğrudan sorabilirsin." },
  en: { title: "Frequently Asked Questions", subtitle: "Can't find what you're looking for? Ask us directly on our Discord server." },
};

export default function FaqPage() {
  const { locale } = useLocale();
  const t = STRINGS[locale];
  const faqs = locale === "en" ? FAQS_EN : FAQS_TR;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-white sm:text-4xl">{t.title}</h1>
      <p className="mt-3 text-sm text-zinc-400">{t.subtitle}</p>

      <div className="mt-10 divide-y divide-zinc-800 border-y border-zinc-800">
        {faqs.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left"
              >
                <span className="text-sm font-medium text-zinc-100">{item.q}</span>
                <span
                  className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-45" : ""}`}
                  aria-hidden
                >
                  +
                </span>
              </button>
              {open && <p className="max-w-2xl pb-4 text-sm leading-relaxed text-zinc-400">{item.a}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
