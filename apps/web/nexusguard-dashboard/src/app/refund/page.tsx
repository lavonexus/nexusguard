import LegalDoc, { type LegalSection } from "@/components/LegalDoc";

const SECTIONS: LegalSection[] = [
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

export default function RefundPage() {
  return (
    <LegalDoc
      title="İade Politikası"
      updatedLabel="15 Ağustos 2026"
      intro={
        <>
          Satın alım Discord ticket&apos;larından yürüdüğü için iade süreci de aynı kanaldan,
          bir yöneticinin talebini gözden geçirmesiyle işler - otomatik/anında iade yapan bir
          ödeme sağlayıcısı sitede bulunmaz.
        </>
      }
      sections={SECTIONS}
    />
  );
}
