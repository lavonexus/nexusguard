import LegalDoc, { type LegalSection } from "@/components/LegalDoc";

const SECTIONS: LegalSection[] = [
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

export default function TermsPage() {
  return (
    <LegalDoc
      title="Kullanım Koşulları"
      updatedLabel="15 Ağustos 2026"
      intro={
        <>
          NexusGuard&apos;a erişmeden ya da Scanner&apos;ı çalıştırmadan önce bu koşulları
          okumanı öneririz. Aşağıdaki maddeler, hesabını oluşturduğun andan itibaren seninle
          aramızdaki anlaşmayı oluşturur.
        </>
      }
      sections={SECTIONS}
    />
  );
}
