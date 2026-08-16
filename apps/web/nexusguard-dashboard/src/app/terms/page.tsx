"use client";

import LegalDoc, { type LegalSection } from "@/components/LegalDoc";
import { useLocale } from "@/lib/i18n/LocaleContext";

const SECTIONS_TR: LegalSection[] = [
  {
    id: "giris",
    label: "Giriş",
    body: (
      <>
        <p>
          Bu Kullanım Koşulları, NexusGuard&apos;ı (&quot;Hizmet&quot;, &quot;biz&quot;) kullanan
          herkes için geçerlidir: bir FiveM sunucusu için hesap oluşturan yöneticiler, o hesaba
          eklenen ekip üyeleri ve Scanner uygulamasını çalıştıran oyuncular.
        </p>
        <p>
          Bir hesap oluşturarak, Scanner&apos;ı indirip çalıştırarak ya da dashboard&apos;a
          erişerek bu koşulları kabul etmiş sayılırsın. Kabul etmiyorsan Hizmet&apos;i
          kullanmamalısın.
        </p>
      </>
    ),
  },
  {
    id: "hizmetin-tanimi",
    label: "Hizmetin Tanımı",
    body: (
      <>
        <p>
          NexusGuard, FiveM sunucu yöneticilerinin oyuncuların bilgisayarında sunucu tarafında
          değerlendirilen bir tarama başlatmasını sağlayan bir araçtır. Sistem üç parçadan
          oluşur: oyuncunun çalıştırdığı Scanner uygulaması, taramaları ve tespitleri yöneten
          API, ve yöneticinin sonuçları gördüğü web panosu (dashboard).
        </p>
        <p>
          Scanner, kendi başına hiçbir şeyin &quot;hile&quot; olup olmadığına karar vermez -
          yalnızca ham veri toplayıp sunucuya iletir. Bir bulgunun şüpheli sayılıp
          sayılmayacağına her zaman sunucu tarafındaki Detection Engine karar verir. Bu, tek
          taraflı ya da istemci tarafından manipüle edilebilecek bir karar mekanizması
          kurmamak için bilinçli bir mimari tercihtir.
        </p>
      </>
    ),
  },
  {
    id: "hesap",
    label: "Hesap Oluşturma",
    body: (
      <>
        <p>
          Dashboard&apos;a Discord ya da Google hesabınla giriş yaparsın; NexusGuard ayrı bir
          şifre tutmaz, kimlik doğrulaması tamamen bu sağlayıcılara aittir. Kullanıcı adın,
          giriş yaptığın sağlayıcıdaki adınla senkronize kalır.
        </p>
        <p>
          Hesabının güvenliğinden - yani Discord/Google hesabını kimseyle paylaşmamaktan - sen
          sorumlusun. Sunucun için üretilen API anahtarı bir kez gösterilir; kaybedersen
          Ayarlar&apos;dan yenileyebilirsin.
        </p>
      </>
    ),
  },
  {
    id: "planlar",
    label: "Planlar ve Satın Alma",
    body: (
      <>
        <p>
          Her yeni sunucu otomatik olarak Free planla başlar ve günde bir tarama hakkı içerir.
          Ücretli planlar (PRO, PRO DUO, Enterprise) daha fazla tarama ve ekip yönetimi
          sağlar; güncel fiyatlandırma /pricing sayfasında yer alır.
        </p>
        <p>
          NexusGuard sitesi üzerinden kart bilgisi almaz. Satın alım, Discord sunucumuzda
          açılan bir talep (ticket) üzerinden yürütülür; ödeme onaylandıktan sonra bir site
          yöneticisi planı hesabına elle tanımlar ve süresini belirler. İade koşulları için
          ayrı İade sayfamıza bakabilirsin.
        </p>
      </>
    ),
  },
  {
    id: "veri-toplama",
    label: "Tarama Sırasında Veri Toplama",
    body: (
      <>
        <p>
          Scanner çalıştırıldığında, o oturuma özel bir PIN doğrulandıktan sonra bilgisayardan
          işlem listesi, yüklü modüller, belirli dosya/dizin bilgileri ve FiveM&apos;e özgü
          bazı veriler toplanır. Hangi verilerin toplandığına dair tam liste ve bunların nasıl
          saklandığı Gizlilik Politikamızda ayrıntılı olarak açıklanır.
        </p>
        <p>
          Taranan kişiye kendi risk skoru veya tespit sonucu hiçbir zaman gösterilmez; bu bilgi
          yalnızca ilgili sunucunun yöneticilerine ve yetkili ekip üyelerine açıktır.
        </p>
      </>
    ),
  },
  {
    id: "kullanici-sorumluluklari",
    label: "Kullanıcı Sorumlulukları",
    body: (
      <>
        <p>
          Bir sunucu yöneticisi olarak, Scanner indirme bağlantısını ve PIN&apos;i yalnızca
          taranmasını istediğin kişiyle paylaşmakla, ve toplanan verileri kendi sunucu
          kurallarına uygun, ölçülü bir şekilde kullanmakla yükümlüsün.
        </p>
        <p>
          Bir oyuncu olarak Scanner&apos;ı çalıştırman, sana PIN&apos;i veren sunucu
          yöneticisine bilgisayarındaki ilgili verileri paylaşmayı kabul ettiğin anlamına
          gelir.
        </p>
      </>
    ),
  },
  {
    id: "yasakli-kullanim",
    label: "Yasaklı Kullanım",
    body: (
      <>
        <p>Aşağıdakiler kesinlikle yasaktır:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Scanner&apos;ı tersine mühendislikle çözmeye, tespitten kaçınacak şekilde değiştirmeye ya da sahte veri döndürecek şekilde yamalamaya çalışmak.</li>
          <li>API&apos;ye veya dashboard&apos;a yetkisiz erişim sağlamaya çalışmak, ya da başka bir sunucunun API anahtarını izinsiz kullanmak.</li>
          <li>PIN&apos;i, tarama linkini ya da API anahtarını rıza dışı, gizlice birine taramayı çalıştırtmak için kullanmak.</li>
          <li>Hizmet&apos;i FiveM/GTA V dışındaki bir amaçla, ya da yürürlükteki yasalara aykırı şekilde kullanmak.</li>
        </ul>
      </>
    ),
  },
  {
    id: "fikri-mulkiyet",
    label: "Fikri Mülkiyet",
    body: (
      <p>
        NexusGuard adı, logosu, Scanner uygulaması, API ve dashboard&apos;un kaynak kodu bize
        aittir. Tool Designer üzerinden yüklediğin logo/marka öğeleri senin mülkiyetinde kalır;
        bunları yalnızca kendi Scanner temanı özelleştirmek için kullanma iznimiz olur.
      </p>
    ),
  },
  {
    id: "sorumluluk",
    label: "Sorumluluğun Sınırlandırılması",
    body: (
      <p>
        NexusGuard, bir tespiti kesin bir hile kanıtı olarak sunmaz - risk skorları ve
        tespitler, bir yöneticinin kendi kararını vermesine yardımcı olacak sinyallerdir.
        Hizmet &quot;olduğu gibi&quot; sunulur; bir tespite dayanarak alınan disiplin
        kararlarının sorumluluğu ilgili sunucu yönetimine aittir.
      </p>
    ),
  },
  {
    id: "fesih",
    label: "Hesabın Sonlandırılması",
    body: (
      <p>
        Bu koşulları ihlal ettiğini tespit edersek hesabını askıya alabilir ya da kalıcı olarak
        kapatabiliriz. Hesabını istediğin zaman kendin de kapatabilirsin; bu durumda sunucuna
        ait geçmiş tarama kayıtları da erişilemez hale gelir.
      </p>
    ),
  },
  {
    id: "degisiklikler",
    label: "Değişiklikler",
    body: (
      <p>
        Bu koşulları zaman zaman güncelleyebiliriz. Önemli değişikliklerde bu sayfadaki
        &quot;Son güncelleme&quot; tarihini güncelleriz; Hizmet&apos;i kullanmaya devam etmen
        güncel koşulları kabul ettiğin anlamına gelir.
      </p>
    ),
  },
  {
    id: "iletisim",
    label: "İletişim",
    body: (
      <p>
        Bu koşullarla ilgili sorular için Discord sunucumuzdan bize ulaşabilirsin.
      </p>
    ),
  },
];

const SECTIONS_EN: LegalSection[] = [
  {
    id: "intro",
    label: "Introduction",
    body: (
      <>
        <p>
          These Terms of Service apply to everyone using NexusGuard (the &quot;Service&quot;,
          &quot;we&quot;): admins who create an account for a FiveM server, team members added
          to that account, and players who run the Scanner application.
        </p>
        <p>
          By creating an account, downloading and running the Scanner, or accessing the
          dashboard, you're considered to have accepted these terms. If you don't accept them,
          you shouldn't use the Service.
        </p>
      </>
    ),
  },
  {
    id: "service-description",
    label: "Description of the Service",
    body: (
      <>
        <p>
          NexusGuard is a tool that lets FiveM server admins start a scan on a player's computer
          that's evaluated server-side. The system has three parts: the Scanner application the
          player runs, the API that manages scans and detections, and the web dashboard where the
          admin sees results.
        </p>
        <p>
          The Scanner never decides on its own whether anything is "cheating" - it only collects
          raw data and sends it to the server. Whether a finding counts as suspicious is always
          decided by the server-side Detection Engine. This is a deliberate architectural choice
          to avoid a decision mechanism that could be one-sided or manipulated client-side.
        </p>
      </>
    ),
  },
  {
    id: "account",
    label: "Creating an Account",
    body: (
      <>
        <p>
          You sign in to the dashboard with your Discord or Google account; NexusGuard doesn't
          keep a separate password, authentication belongs entirely to these providers. Your
          username stays in sync with your name on the provider you signed in with.
        </p>
        <p>
          You're responsible for your account's security - i.e. not sharing your Discord/Google
          account with anyone. The API key generated for your server is shown once; if you lose
          it, you can rotate it from Settings.
        </p>
      </>
    ),
  },
  {
    id: "plans",
    label: "Plans and Purchases",
    body: (
      <>
        <p>
          Every new server automatically starts on the Free plan and includes one scan a day.
          Paid plans (PRO, PRO DUO, Enterprise) provide more scans and team management; current
          pricing is on the /pricing page.
        </p>
        <p>
          The NexusGuard site never collects card details. Purchases go through a ticket opened on
          our Discord server; once payment is confirmed, a site admin manually applies the plan to
          the account and sets its duration. See our separate Refund page for refund terms.
        </p>
      </>
    ),
  },
  {
    id: "data-collection",
    label: "Data Collection During a Scan",
    body: (
      <>
        <p>
          When the Scanner runs, after a PIN specific to that session is verified, it collects a
          process list, loaded modules, certain file/directory information, and some FiveM-specific
          data from the computer. The full list of what's collected and how it's stored is detailed
          in our Privacy Policy.
        </p>
        <p>
          The scanned person is never shown their own risk score or detection results; that
          information is only visible to that server's admins and authorized team members.
        </p>
      </>
    ),
  },
  {
    id: "user-responsibilities",
    label: "User Responsibilities",
    body: (
      <>
        <p>
          As a server admin, you're responsible for only sharing the Scanner download link and
          the PIN with the person you intend to scan, and for using the collected data reasonably,
          in line with your own server's rules.
        </p>
        <p>
          As a player, running the Scanner means you're agreeing to share the relevant data on your
          computer with the server admin who gave you the PIN.
        </p>
      </>
    ),
  },
  {
    id: "prohibited-use",
    label: "Prohibited Use",
    body: (
      <>
        <p>The following are strictly prohibited:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Attempting to reverse-engineer the Scanner, modify it to evade detection, or patch it to return fake data.</li>
          <li>Attempting unauthorized access to the API or dashboard, or using another server's API key without permission.</li>
          <li>Using the PIN, scan link, or API key to run a scan on someone without their consent or knowledge.</li>
          <li>Using the Service for a purpose other than FiveM/GTA V, or in violation of applicable law.</li>
        </ul>
      </>
    ),
  },
  {
    id: "ip",
    label: "Intellectual Property",
    body: (
      <p>
        The NexusGuard name, logo, Scanner application, API, and the dashboard's source code
        belong to us. Logo/branding assets you upload through Tool Designer remain your property;
        we only get permission to use them to customize your own Scanner theme.
      </p>
    ),
  },
  {
    id: "liability",
    label: "Limitation of Liability",
    body: (
      <p>
        NexusGuard doesn't present a detection as definitive proof of cheating - risk scores and
        detections are signals meant to help an admin make their own decision. The Service is
        provided "as is"; responsibility for any disciplinary decision made based on a detection
        rests with the relevant server's management.
      </p>
    ),
  },
  {
    id: "termination",
    label: "Account Termination",
    body: (
      <p>
        If we determine you've violated these terms, we may suspend or permanently close your
        account. You can also close your account yourself at any time; in that case, your
        server's historical scan records also become inaccessible.
      </p>
    ),
  },
  {
    id: "changes",
    label: "Changes",
    body: (
      <p>
        We may update these terms from time to time. For significant changes, we update the
        "Last updated" date on this page; continuing to use the Service means you accept the
        current terms.
      </p>
    ),
  },
  {
    id: "contact",
    label: "Contact",
    body: (
      <p>
        For questions about these terms, you can reach us on our Discord server.
      </p>
    ),
  },
];

const STRINGS = {
  tr: {
    title: "Kullanım Koşulları",
    updatedLabel: "15 Ağustos 2026",
    intro: (
      <>
        NexusGuard&apos;a erişmeden ya da Scanner&apos;ı çalıştırmadan önce bu koşulları
        okumanı öneririz. Aşağıdaki maddeler, hesabını oluşturduğun andan itibaren seninle
        aramızdaki anlaşmayı oluşturur.
      </>
    ),
  },
  en: {
    title: "Terms of Service",
    updatedLabel: "August 15, 2026",
    intro: (
      <>
        We recommend reading these terms before accessing NexusGuard or running the Scanner.
        The clauses below form the agreement between you and us from the moment you create your
        account.
      </>
    ),
  },
};

export default function TermsPage() {
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
