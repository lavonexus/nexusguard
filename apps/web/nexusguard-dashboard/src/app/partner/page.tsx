"use client";

import { DISCORD_PURCHASE_URL } from "@/lib/api";
import { useT, type Dict } from "@/lib/i18n/useT";

interface Track {
  title: string;
  desc: string;
}

const TRACKS: Dict<Track[]> = {
  tr: [
    {
      title: "FiveM Sunucu Toplulukları",
      desc:
        "Kendi sunucunda NexusGuard kullanan bir topluluk yönetiyorsan, ekibinle birlikte özel bir Tool Designer teması ve öncelikli destek kanalı için bizimle iletişime geç.",
    },
    {
      title: "İçerik Üreticileri",
      desc:
        "FiveM sunucu yönetimi, moderasyon ya da anti-hile üzerine içerik üretiyorsan, izleyicilerine özel bir tanıtım kodu ve erken erişim fırsatları sunabiliriz.",
    },
    {
      title: "Bayi / Reseller",
      desc:
        "Birden fazla sunucu sahibine hizmet veriyorsan (örn. bir hosting ya da moderasyon ekibi olarak), NexusGuard planlarını müşterilerine önerip komisyon kazanabileceğin bir işbirliği kurabiliriz.",
    },
  ],
  en: [
    {
      title: "FiveM Server Communities",
      desc:
        "If you run a community using NexusGuard on your own server, reach out to us with your team for a custom Tool Designer theme and a priority support channel.",
    },
    {
      title: "Content Creators",
      desc:
        "If you create content about FiveM server administration, moderation, or anti-cheat, we can offer your audience a dedicated promo code and early-access opportunities.",
    },
    {
      title: "Reseller",
      desc:
        "If you serve multiple server owners (e.g. as a hosting or moderation team), we can set up a partnership where you recommend NexusGuard plans to your customers and earn a commission.",
    },
  ],
};

const STRINGS: Dict<{
  title: string;
  subtitle: string;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButton: string;
}> = {
  tr: {
    title: "İş Ortaklığı",
    subtitle:
      "NexusGuard'ı büyütmek istediğimiz kadar, onu zaten kullanan toplulukları da desteklemek istiyoruz. Aşağıdaki alanların herhangi birinde sana uyan bir işbirliği modeli kurabiliriz - koşullar her ortaklık için ayrı konuşulur, sabit bir paket satmıyoruz.",
    ctaTitle: "Konuşmaya hazırız",
    ctaSubtitle: "Hangi modelin sana uyduğundan emin değilsen de sorun değil - Discord'dan yaz, birlikte netleştirelim.",
    ctaButton: "Discord'dan ulaş",
  },
  en: {
    title: "Partnerships",
    subtitle:
      "As much as we want to grow NexusGuard, we also want to support the communities already using it. We can set up a partnership model that fits any of the tracks below - terms are discussed per partnership, we don't sell a fixed package.",
    ctaTitle: "We're ready to talk",
    ctaSubtitle: "Not sure which model fits you? That's fine too - message us on Discord and we'll figure it out together.",
    ctaButton: "Reach out on Discord",
  },
};

export default function PartnerPage() {
  const tracks = useT(TRACKS);
  const t = useT(STRINGS);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">{t.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">{t.subtitle}</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {tracks.map((track) => (
          <div key={track.title} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="text-sm font-semibold text-white">{track.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{track.desc}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-14 flex max-w-lg flex-col items-center rounded-2xl border border-violet-900/40 bg-gradient-to-b from-violet-950/30 to-transparent px-8 py-10 text-center">
        <h2 className="text-lg font-semibold text-white">{t.ctaTitle}</h2>
        <p className="mt-2 text-sm text-zinc-400">{t.ctaSubtitle}</p>
        <a
          href={DISCORD_PURCHASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 rounded-md bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          {t.ctaButton}
        </a>
      </div>
    </div>
  );
}
