"use client";

import { useState } from "react";
import Link from "next/link";
import { DISCORD_PURCHASE_URL } from "@/lib/api";

const FAQS: { q: string; a: React.ReactNode }[] = [
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

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-white sm:text-4xl">Sıkça Sorulan Sorular</h1>
      <p className="mt-3 text-sm text-zinc-400">
        Aradığını bulamazsan Discord sunucumuzdan bize doğrudan sorabilirsin.
      </p>

      <div className="mt-10 divide-y divide-zinc-800 border-y border-zinc-800">
        {FAQS.map((item, i) => {
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
