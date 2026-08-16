"use client";

import LegalDoc, { type LegalSection } from "@/components/LegalDoc";
import { useLocale } from "@/lib/i18n/LocaleContext";

const SECTIONS_TR: LegalSection[] = [
  {
    id: "giris",
    label: "Giriş",
    body: (
      <p>
        NexusGuard, mümkün olan en az veriyi toplayıp bunu yalnızca hile tespiti için
        kullanmak üzere tasarlandı. Bu sayfa, Scanner çalıştığında ya da dashboard&apos;a giriş
        yaptığında hangi bilgilerin toplandığını, nasıl saklandığını ve kiminle
        paylaşıldığını (paylaşılıyorsa) anlatır.
      </p>
    ),
  },
  {
    id: "hesap-verileri",
    label: "Hesap Verileri",
    body: (
      <>
        <p>
          Dashboard&apos;a Discord ya da Google ile giriş yaptığında, o sağlayıcıdan yalnızca
          kullanıcı adını, benzersiz bir kimlik numarasını ve (Google girişinde) e-posta
          adresini alırız. Ayrı bir şifre tutmayız - kimlik doğrulama tamamen Discord/Google
          tarafından yapılır.
        </p>
        <p>
          Oturumun tarayıcında bir çerezle (ng_session) tutulur; bu çerez yalnızca hangi
          hesapla giriş yaptığını hatırlamak için kullanılır, reklam ya da üçüncü taraf takibi
          amacıyla kullanılmaz.
        </p>
      </>
    ),
  },
  {
    id: "tarama-verileri",
    label: "Tarama Sırasında Toplanan Veriler",
    body: (
      <>
        <p>
          Bir tarama PIN&apos;le doğrulandıktan sonra, Scanner ilgili bilgisayardan aşağıdaki
          türde ham verileri toplayıp sunucuya iletir: çalışan işlemler ve bunların
          imzaları/yolları, FiveM sürecine yüklenen modüller, belirli klasörlerde bulunan
          dosyaların adı/boyutu/hash değeri, FiveM&apos;e özgü RPF arşivlerinin iç içerik
          listesi, bu bilgisayara bağlanmış USB depolama geçmişi, başlangıçta çalışan
          programlar, zamanlanmış görevler ve servisler.
        </p>
        <p>
          Bu liste, Scanner&apos;ın kaynak kodunda tanımlıdır ve zaman içinde genişleyebilir;
          ama ilke değişmez: Scanner hiçbir zaman kendi başına &quot;bu bir hile&quot; kararı
          vermez, yalnızca ne gördüğünü bildirir. Kararı, bu ham veriyi işleyen sunucu
          tarafındaki Detection Engine verir.
        </p>
        <p>
          Bir YARA taraması için bir dosyanın ham baytları sunucuya yüklendiğinde, o bayt
          dizisi yalnızca taramanın yapıldığı an için geçici olarak tutulur ve tarama biter
          bitmez diskten silinir - kalıcı olarak saklanmaz.
        </p>
      </>
    ),
  },
  {
    id: "kullanim-amaci",
    label: "Verileri Nasıl Kullanıyoruz",
    body: (
      <>
        <p>
          Toplanan tarama verileri, Detection Engine tarafından değerlendirilip bir risk skoru
          ve tespit listesine dönüştürülür; bu sonuç yalnızca ilgili sunucunun dashboard&apos;unda
          yöneticilere ve yetkili ekip üyelerine gösterilir. Taranan kişinin kendisi risk
          skorunu ya da tespit detaylarını hiçbir zaman görmez.
        </p>
        <p>
          Bir sunucu yöneticisi isterse, tespit edilen bulguların kısa bir özetini yapay zeka
          ile oluşturabilir - bu durumda tespit açıklamaları (ham sistem verisi değil,
          zaten hesaplanmış bulgu metinleri) özetleme için Anthropic&apos;in API&apos;sine
          gönderilir. Bu özellik kullanılmadığı sürece hiçbir veri üçüncü bir servise gitmez.
        </p>
      </>
    ),
  },
  {
    id: "paylasim",
    label: "Verilerin Paylaşımı",
    body: (
      <p>
        Verilerini reklam amacıyla satmayız ya da kiralamayız. Veriler yalnızca yukarıda
        anlatılan amaçla (Detection Engine değerlendirmesi, tercihen açılan yapay zeka özeti)
        ve giriş için kullandığın Discord/Google ile paylaşılır. Yasal bir zorunluluk
        olmadıkça verilerini başka hiçbir üçüncü tarafa aktarmayız.
      </p>
    ),
  },
  {
    id: "saklama",
    label: "Veri Saklama",
    body: (
      <p>
        Tarama sonuçları, hesabın ve ilişkili sunucun aktif olduğu sürece saklanır. Hesabını
        kapatmamızı istersen, o hesaba bağlı sunucuların geçmiş tarama kayıtları da kalıcı
        olarak silinir. Silme talepleri için Discord üzerinden bize ulaşabilirsin.
      </p>
    ),
  },
  {
    id: "haklarin",
    label: "Taranan Kişi Olarak Hakların",
    body: (
      <>
        <p>
          Scanner&apos;ı çalıştırdığında, hangi sunucunun seni taradığını her zaman
          bilirsin - PIN sana o sunucunun yöneticisi tarafından verilir, gizli ya da arka
          planda çalışan bir tarama yoktur. Ne toplandığını bu sayfadan öğrenebilirsin.
        </p>
        <p>
          Kendi verilerinin silinmesini istersen, ilgili sunucunun yöneticisiyle ya da
          doğrudan bizimle Discord üzerinden iletişime geçebilirsin.
        </p>
      </>
    ),
  },
  {
    id: "guvenlik",
    label: "Güvenlik",
    body: (
      <p>
        API anahtarların ve oturum belirteçlerin veritabanında düz metin olarak değil, tek
        yönlü özet (hash) olarak tutulur - biz dahi mevcut bir anahtarı ya da oturum
        belirtecini tekrar okuyamayız, yalnızca doğrulayabiliriz.
      </p>
    ),
  },
  {
    id: "guncellemeler",
    label: "Politika Güncellemeleri",
    body: (
      <p>
        Bu politikayı zaman zaman güncelleyebiliriz; önemli değişikliklerde bu sayfanın
        üstündeki tarihi güncelleriz. Hizmet&apos;i kullanmaya devam etmen güncel politikayı
        kabul ettiğin anlamına gelir.
      </p>
    ),
  },
  {
    id: "iletisim",
    label: "Bize Ulaşın",
    body: <p>Verilerinle ilgili sorular için Discord sunucumuzdan bize yazabilirsin.</p>,
  },
];

const SECTIONS_EN: LegalSection[] = [
  {
    id: "intro",
    label: "Introduction",
    body: (
      <p>
        NexusGuard is designed to collect as little data as possible and use it only for cheat
        detection. This page explains what information is collected when the Scanner runs or
        when you sign in to the dashboard, how it's stored, and who it's shared with (if anyone).
      </p>
    ),
  },
  {
    id: "account-data",
    label: "Account Data",
    body: (
      <>
        <p>
          When you sign in to the dashboard with Discord or Google, we only receive your
          username, a unique ID, and (for Google sign-in) your email address from that provider.
          We don't keep a separate password - authentication is handled entirely by Discord/Google.
        </p>
        <p>
          Your session is kept in your browser via a cookie (ng_session); this cookie is only used
          to remember which account you signed in with, never for advertising or third-party
          tracking.
        </p>
      </>
    ),
  },
  {
    id: "scan-data",
    label: "Data Collected During a Scan",
    body: (
      <>
        <p>
          Once a scan is verified with a PIN, the Scanner collects the following types of raw
          data from that computer and sends it to the server: running processes and their
          signatures/paths, modules loaded into the FiveM process, the name/size/hash of files in
          certain folders, the internal content listing of FiveM-specific RPF archives, USB
          storage history connected to that computer, programs that run at startup, scheduled
          tasks, and services.
        </p>
        <p>
          This list is defined in the Scanner's source code and may expand over time; but the
          principle stays the same: the Scanner never decides on its own that something "is a
          cheat" - it only reports what it saw. The decision is made by the server-side Detection
          Engine that processes this raw data.
        </p>
        <p>
          When a file's raw bytes are uploaded to the server for a YARA scan, that byte sequence is
          only held temporarily for the duration of the scan and is deleted from disk as soon as
          the scan finishes - it is never stored permanently.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-data",
    label: "How We Use the Data",
    body: (
      <>
        <p>
          Collected scan data is evaluated by the Detection Engine and turned into a risk score
          and a list of detections; this result is only shown to admins and authorized team
          members on that server's dashboard. The scanned person never sees their own risk score
          or detection details.
        </p>
        <p>
          If a server admin chooses to, they can generate a short AI summary of the detected
          findings - in that case, the detection descriptions (already-computed finding text, not
          raw system data) are sent to Anthropic's API for summarization. No data goes to a third
          party unless this feature is used.
        </p>
      </>
    ),
  },
  {
    id: "data-sharing",
    label: "Data Sharing",
    body: (
      <p>
        We never sell or rent your data for advertising. Data is only shared for the purposes
        described above (Detection Engine evaluation, the optional AI summary) and with the
        Discord/Google provider you used to sign in. We don't transfer your data to any other
        third party unless legally required to.
      </p>
    ),
  },
  {
    id: "retention",
    label: "Data Retention",
    body: (
      <p>
        Scan results are kept for as long as your account and its associated server remain
        active. If you ask us to close your account, the historical scan records for servers
        linked to that account are also permanently deleted. Contact us on Discord for deletion
        requests.
      </p>
    ),
  },
  {
    id: "your-rights",
    label: "Your Rights as a Scanned Person",
    body: (
      <>
        <p>
          When you run the Scanner, you always know which server is scanning you - the PIN is
          given to you by that server's admin, there's no hidden or background scan. You can find
          out what's collected from this page.
        </p>
        <p>
          If you want your own data deleted, you can contact the relevant server's admin, or reach
          out to us directly on Discord.
        </p>
      </>
    ),
  },
  {
    id: "security",
    label: "Security",
    body: (
      <p>
        Your API keys and session tokens are stored in the database as one-way hashes, not plain
        text - even we can't read an existing key or session token back, only verify it.
      </p>
    ),
  },
  {
    id: "policy-updates",
    label: "Policy Updates",
    body: (
      <p>
        We may update this policy from time to time; for significant changes, we update the date
        at the top of this page. Continuing to use the Service means you accept the current
        policy.
      </p>
    ),
  },
  {
    id: "contact",
    label: "Contact Us",
    body: <p>For questions about your data, you can message us on our Discord server.</p>,
  },
];

const STRINGS = {
  tr: {
    title: "Gizlilik Politikası",
    updatedLabel: "15 Ağustos 2026",
    intro: (
      <>
        Gizliliğin bir tercih değil, bir gereklilik olduğunu düşünüyoruz. NexusGuard
        kullanıcıları izlemek için değil, hileyi sunucu tarafında güvenilir şekilde tespit
        etmek için var - bu sayfa, o amaç için hangi sınırlı verinin toplandığını ve neden
        toplandığını açıklar.
      </>
    ),
  },
  en: {
    title: "Privacy Policy",
    updatedLabel: "August 15, 2026",
    intro: (
      <>
        We believe privacy is a requirement, not an option. NexusGuard exists to reliably detect
        cheating server-side, not to track users - this page explains what limited data is
        collected for that purpose, and why.
      </>
    ),
  },
};

export default function PrivacyPage() {
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
