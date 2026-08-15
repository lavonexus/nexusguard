import LegalDoc, { type LegalSection } from "@/components/LegalDoc";

const SECTIONS: LegalSection[] = [
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

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Gizlilik Politikası"
      updatedLabel="15 Ağustos 2026"
      intro={
        <>
          Gizliliğin bir tercih değil, bir gereklilik olduğunu düşünüyoruz. NexusGuard
          kullanıcıları izlemek için değil, hileyi sunucu tarafında güvenilir şekilde tespit
          etmek için var - bu sayfa, o amaç için hangi sınırlı verinin toplandığını ve neden
          toplandığını açıklar.
        </>
      }
      sections={SECTIONS}
    />
  );
}
