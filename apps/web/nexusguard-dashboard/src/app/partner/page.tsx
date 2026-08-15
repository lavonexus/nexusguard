import { DISCORD_PURCHASE_URL } from "@/lib/api";

const TRACKS: { title: string; desc: string }[] = [
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
];

export default function PartnerPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">İş Ortaklığı</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">
          NexusGuard&apos;ı büyütmek istediğimiz kadar, onu zaten kullanan toplulukları da
          desteklemek istiyoruz. Aşağıdaki alanların herhangi birinde sana uyan bir işbirliği
          modeli kurabiliriz - koşullar her ortaklık için ayrı konuşulur, sabit bir paket
          satmıyoruz.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {TRACKS.map((t) => (
          <div key={t.title} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="text-sm font-semibold text-white">{t.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t.desc}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-14 flex max-w-lg flex-col items-center rounded-2xl border border-violet-900/40 bg-gradient-to-b from-violet-950/30 to-transparent px-8 py-10 text-center">
        <h2 className="text-lg font-semibold text-white">Konuşmaya hazırız</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Hangi modelin sana uyduğundan emin değilsen de sorun değil - Discord&apos;dan yaz,
          birlikte netleştirelim.
        </p>
        <a
          href={DISCORD_PURCHASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 rounded-md bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          Discord&apos;dan ulaş
        </a>
      </div>
    </div>
  );
}
