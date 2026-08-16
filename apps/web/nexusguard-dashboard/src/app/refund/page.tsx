"use client";

import LegalDoc, { type LegalSection } from "@/components/LegalDoc";
import { useLocale } from "@/lib/i18n/LocaleContext";

const SECTIONS_TR: LegalSection[] = [
  {
    id: "giris",
    label: "Giriş",
    body: (
      <p>
        NexusGuard&apos;da ödeme sitenin kendisinden değil, Discord üzerinden alınır - bu
        yüzden iade süreci de klasik bir e-ticaret akışından farklı, insan onayına dayalı bir
        şekilde işler. Bu sayfa o sürecin nasıl işlediğini açıklar.
      </p>
    ),
  },
  {
    id: "satin-alma",
    label: "Satın Alma Nasıl Çalışır",
    body: (
      <p>
        Bir paket seçip &quot;Satın Al&quot; dediğinde Discord sunucumuza yönlendirilirsin;
        orada bir talep (ticket) açarak ödemeni tamamlarsın. Ödeme onaylandıktan sonra bir site
        yöneticisi, seçtiğin planı ve süresini (örn. 1 ay, 3 ay) hesabına elle tanımlar. Bu
        andan itibaren plan aktif kabul edilir.
      </p>
    ),
  },
  {
    id: "iade-talebi",
    label: "İade Talebi Nasıl Açılır",
    body: (
      <p>
        Bir iade talebin varsa, satın alımı yaptığın Discord ticket&apos;ı üzerinden ya da yeni
        bir talep açarak bize ulaş. Talebini değerlendirebilmemiz için hangi paketi, ne zaman
        satın aldığını ve iade sebebini belirtmen yeterli.
      </p>
    ),
  },
  {
    id: "kosullar",
    label: "İade Koşulları",
    body: (
      <>
        <p>
          Planın etkinleştirildiği tarihten itibaren <strong>ilk 48 saat içinde</strong>{" "}
          ve ilgili sunucuda ücretli plana özgü hiçbir tarama gerçekleştirilmediyse, talebin
          değerlendirmeye alınır ve genellikle tam iade yapılır.
        </p>
        <p>
          48 saati geçen ya da plan kapsamında tarama yapılmış talepler tek tek incelenir; bu
          durumda kullanılan süreye/tarama sayısına orantılı kısmi bir iade önerebiliriz.
          Karar, her durumun kendi koşullarına göre bizim takdirimizdedir.
        </p>
      </>
    ),
  },
  {
    id: "plan-iptali",
    label: "Plan İptali",
    body: (
      <p>
        İade istemeden sadece ücretli planını sonlandırmak istiyorsan, bunu da Discord
        üzerinden talep edebilirsin - bir site yöneticisi planını anında Free&apos;ye
        döndürür. Bu, kalan sürenin geri ödenmesi anlamına gelmez; yalnızca planın süresinden
        önce sona erdirilmesidir.
      </p>
    ),
  },
  {
    id: "istisnalar",
    label: "İstisnalar",
    body: (
      <p>
        Hesap askıya alma ile sonuçlanan bir Kullanım Koşulları ihlali varsa (bkz.
        &quot;Yasaklı Kullanım&quot;), o hesaba bağlı hiçbir ödeme iade edilmez.
      </p>
    ),
  },
  {
    id: "iletisim",
    label: "İletişim",
    body: <p>İade ve iptal talepleri yalnızca Discord sunucumuz üzerinden alınır.</p>,
  },
];

const SECTIONS_EN: LegalSection[] = [
  {
    id: "intro",
    label: "Introduction",
    body: (
      <p>
        Payment for NexusGuard is taken through Discord, not the site itself - so the refund
        process also works differently from a typical e-commerce flow, relying on human review.
        This page explains how that process works.
      </p>
    ),
  },
  {
    id: "how-purchases-work",
    label: "How Purchases Work",
    body: (
      <p>
        When you pick a package and click "Buy", you're taken to our Discord server; there, you
        open a ticket to complete your payment. Once payment is confirmed, a site admin manually
        applies the plan you chose and its duration (e.g. 1 month, 3 months) to your account. The
        plan is considered active from that point on.
      </p>
    ),
  },
  {
    id: "requesting-a-refund",
    label: "How to Request a Refund",
    body: (
      <p>
        If you want a refund, reach us through the Discord ticket you used to purchase, or by
        opening a new ticket. To evaluate your request, just let us know which package, when you
        bought it, and the reason for the refund.
      </p>
    ),
  },
  {
    id: "conditions",
    label: "Refund Conditions",
    body: (
      <>
        <p>
          If requested within the <strong>first 48 hours</strong> of the plan's activation date,
          and no scan specific to the paid plan has been run on that server, your request is
          reviewed and a full refund is generally issued.
        </p>
        <p>
          Requests made after 48 hours, or where a scan has been run under the plan, are reviewed
          case by case; in that case, we may offer a partial refund proportional to the time used
          or the number of scans run. The decision is at our discretion based on each case's own
          circumstances.
        </p>
      </>
    ),
  },
  {
    id: "cancelling",
    label: "Cancelling a Plan",
    body: (
      <p>
        If you just want to end your paid plan without a refund, you can also request that
        through Discord - a site admin will revert your plan to Free immediately. This doesn't
        mean the remaining time is refunded; it only ends the plan before its term is up.
      </p>
    ),
  },
  {
    id: "exceptions",
    label: "Exceptions",
    body: (
      <p>
        If there's a Terms of Service violation that results in account suspension (see
        "Prohibited Use"), no payment tied to that account is refunded.
      </p>
    ),
  },
  {
    id: "contact",
    label: "Contact",
    body: <p>Refund and cancellation requests are only accepted through our Discord server.</p>,
  },
];

const STRINGS = {
  tr: {
    title: "İade Politikası",
    updatedLabel: "15 Ağustos 2026",
    intro: (
      <>
        Satın alım Discord ticket&apos;larından yürüdüğü için iade süreci de aynı kanaldan,
        bir yöneticinin talebini gözden geçirmesiyle işler - otomatik/anında iade yapan bir
        ödeme sağlayıcısı sitede bulunmaz.
      </>
    ),
  },
  en: {
    title: "Refund Policy",
    updatedLabel: "August 15, 2026",
    intro: (
      <>
        Since purchases go through Discord tickets, the refund process runs through the same
        channel, with an admin reviewing your request - the site doesn't have a payment provider
        that issues automatic/instant refunds.
      </>
    ),
  },
};

export default function RefundPage() {
  const { locale } = useLocale();
  const t = STRINGS[locale];

  return (
    <LegalDoc
      title={t.title}
      updatedLabel={t.updatedLabel}
      intro={t.intro}
      sections={locale === "en" ? SECTIONS_EN : SECTIONS_TR}
    />
  );
}
