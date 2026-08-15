# NexusGuard — Phase 1-8

Bu klasör, mimari dokümandaki **Phase 1'den Phase 8'e kadar** olan kısmı içerir:

- ASP.NET Core 8 Web API (`apps/api/NexusGuard.Api`)
- PostgreSQL (EF Core / Npgsql)
- JWT değil, **temporary scan token** sistemi (Server API key + PIN + scan token, section 11)
- Swagger
- Next.js dashboard (`apps/web/nexusguard-dashboard`): Discord login, server/scan yönetimi,
  sonuç ve tespit görüntüleme
- C# Scanner.exe (`apps/scanner/NexusGuard.Scanner`): process/module/dosya/hash/FiveM
  artifact taraması, bu API'ye bağlanıyor
- Sunucu tarafı **Detection Engine**: risk skoru scanner'ın kendi beyanından değil,
  sunucunun ham verilerden hesapladığı kural eşleşmelerinden geliyor
- Discord OAuth login (dashboard) + C# Discord bot (`apps/bot/NexusGuard.Bot`):
  `/nexusguard-link`, `/nexusguard-scan`
- **YARA entegrasyonu**: scanner adayı exe/dll dosyalarını API'ye yükler, sunucu dnYara ile
  gerçek imza taraması yapar (bkz. "YARA taraması" bölümü)
- **AI katmanı**: Detection Engine'in ürettiği bulgular Claude Opus 5 ile admin'in
  okuyabileceği bir risk değerlendirmesine çevriliyor (bkz. "AI özet katmanı" bölümü)

Bu, dokümandaki mimari fazların tamamı.

## Gereksinimler

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- Docker Desktop (Postgres/Redis için)
- Node.js (dashboard için)
- Bir Discord uygulaması (Client ID/Secret + Bot Token) — bkz. "Discord kurulumu"

## Çalıştırma

```bash
# 1) Postgres + Redis'i ayağa kaldır
docker compose up -d

# 2) API'yi çalıştır
cd apps/api/NexusGuard.Api
dotnet restore
dotnet run

# 3) Dashboard'u çalıştır (ayrı bir terminalde)
cd apps/web/nexusguard-dashboard
npm install
npm run dev

# 4) Discord bot'u çalıştır (ayrı bir terminalde)
cd apps/bot/NexusGuard.Bot
dotnet restore
dotnet run
```

- API: `http://localhost:5080` (Development ortamında `Properties/launchSettings.json`
  üzerinden), Swagger: `http://localhost:5080/swagger`
- Dashboard: `http://localhost:3000` — ilk açılışta `/setup`'a yönlenir, "Sign in with
  Discord" ile giriş yapılır
- Bot: Discord'a bağlanıp `Ready` olduğunda konsola yazar; bir sunucuya eklendiğinde o
  sunucuda `/nexusguard-link` ve `/nexusguard-scan` komutlarını otomatik kaydeder

> Not: API artık gerçek **EF Core migration'ları** kullanıyor — `Program.cs` her başlangıçta
> `db.Database.Migrate()` çağırıp bekleyen migration'ları otomatik uygular, ilk çalıştırmada
> şema kendiliğinden kurulur. Model'de değişiklik yaptığında (yeni tablo/kolon):
>
> ```bash
> cd apps/api/NexusGuard.Api
> dotnet ef migrations add <DeğişikliğiAçıklayanİsim>
> dotnet run   # Migrate() bekleyen migration'ı otomatik uygular
> ```
>
> `dotnet-ef` yoksa: `dotnet tool install --global dotnet-ef`.

## Discord kurulumu

1. [discord.com/developers/applications](https://discord.com/developers/applications) →
   **New Application**
2. **OAuth2 → General**: Client ID'yi al, **Reset Secret** ile Client Secret üret,
   **Redirects**'e ekle: `http://localhost:5080/api/auth/discord/callback`
3. **Bot**: **Reset Token** ile Bot Token üret. Privileged intent gerekmiyor (bot sadece
   slash komutlarla çalışıyor).
4. Değerleri **asla appsettings.json'a veya git'e yazma** — user-secrets kullan:

```bash
cd apps/api/NexusGuard.Api
dotnet user-secrets set "Discord:ClientId" "<client-id>"
dotnet user-secrets set "Discord:ClientSecret" "<client-secret>"

cd apps/bot/NexusGuard.Bot
dotnet user-secrets set "Discord:BotToken" "<bot-token>"
dotnet user-secrets set "Discord:ClientId" "<client-id>"
```

5. Botu bir sunucuya eklemek için:
   `https://discord.com/api/oauth2/authorize?client_id=<client-id>&scope=bot%20applications.commands&permissions=0`

## Scanner.exe çalıştırma

Scanner artık bir konsol uygulaması değil, **grafik arayüzlü (WPF) bir masaüstü uygulaması**.
Dashboard'da "New scan" dediğinde hazır bir indirme linki çıkıyor —
`NexusGuard.Scanner.exe` bağımsız (self-contained) tek dosya olarak derlenip
`apps/web/nexusguard-dashboard/public/downloads/` altında duruyor, oyuncunun makinesinde
.NET kurulu olması gerekmiyor.

Akış:

1. Oyuncu exe'yi indirip çift tıklar → doğrudan bir **PIN ekranı** açılır (scan ID veya API
   URL girmesi gerekmez).
2. Dashboard'daki (veya Discord DM'deki) 6 haneli PIN'i girer → uygulama PIN'i tek başına
   sunucuya gönderip scan token'ını arka planda alır.
3. Tarama otomatik başlar; ekranda **yüzdelik ilerleme çubuğu** ve o an taranan şeyin adı
   gösterilir ("Scanning citizen-game-ipc.dll (9/82)..." gibi).
4. Bitince "Scan complete" ekranı risk skorunu gösterir; sonuç aynı anda dashboard'a da
   düşmüş olur (server tarafında zaten hesaplanıp kaydedildiği için).

Kaynaktan çalıştırmak istersen (yine aynı GUI açılır, API adresi varsayılan olarak
`http://localhost:5080`'dir, `--api <url>` ile değiştirilebilir):

```bash
cd apps/scanner/NexusGuard.Scanner
dotnet run
```

Scanner aşağıdakileri **ham veri olarak** API'ye gönderir — kendi "şüpheli" yorumunu katmaz,
risk skorunu ve tespitleri her zaman sunucudaki Detection Engine hesaplar:

- Çalışan tüm process'ler: yol, SHA-256, Authenticode imzası/yayıncısı, üst process (WMI ile)
- FiveM oyun process'ine yüklenen modüller
- FiveM'in `plugins`/`data`/`data\cache`/`citizen`/`server-cache(-priv)` klasörleri,
  `%appdata%\CitizenFX` ve `%localappdata%\CitizenFX`
- FiveM cache/mods'taki `.rpf` arşivleri: isim, boyut, SHA-256 **ve arşivin kendi içindekiler
  tablosundan okunan iç dosya listesi** (`RpfInspector`) — dashboard bunu "Araca hızlı giriş/
  çıkış", "Düşme hasarı/stamina değişikliği" gibi tahmini bir içerik etiketine çeviriyor
- Bulunursa GTA V kurulum dizini (`update`, `x64`, `mods`) — `.exe/.dll/.sys/.asi`
- `%appdata%`, `%localappdata%`, `%localappdata%\Temp`, `%localappdata%\Programs`,
  `%programdata%`, Desktop/Downloads/Documents — sınırlı derinlik ve dosya sayısı ile
  (`DirectoryWalker`, toplamda en fazla ~1500 dosya) `.exe/.dll/.sys/.asi/.bat/.cmd/.ps1`
  (kullanıcı klasörlerinde ayrıca `.zip/.rar/.7z`)
- `.zip/.rar/.7z` arşivleri **hiçbir zaman açılıp çalıştırılmaz** - sadece içindekiler listesi
  okunur (SharpCompress ile)
- Windows Run/RunOnce kayıt defteri anahtarları + Startup klasörleri
- Executable çalıştıran zamanlanmış görevler (PowerShell `Get-ScheduledTask` üzerinden -
  `schtasks` CSV çıktısı yerelleştirilmiş olabildiği için tercih edilmedi)
- `.exe`/`.sys` binary kullanan Windows servisleri
- USB depolama geçmişi (kayıt defterinden, bilgilendirme amaçlı)
- Sistem bilgisi: OS, bilgisayar adı, Windows kurulum tarihi, bölge

Her dosya için: tam yol, SHA-256, Authenticode imzası (varsa yayıncı), oluşturulma/değiştirilme
tarihi. **Önemli**: hiçbir yerde sadece dosya adına bakarak tespit üretilmiyor —
`dinput8.dll`, `dsound.dll`, `ScriptHook*` gibi meşru ASI-loader bileşenleri otomatik hile
sayılmıyor; bunlar da diğerleri gibi ham veri olarak raporlanıyor, karar sunucuda veriliyor.
`.rpf` dosyaları için `DetectionEngine.IllegalRpfNames` içinde küçük, örnek amaçlı bir "bilinen
sahte RPF" listesi var (YARA kuralları gibi genişletilebilir bir başlangıç noktası, gerçek bir
tehdit istihbaratı kaynağı değil). Diğer yeni kategoriler (Autostart/ScheduledTask/Service/
FileEvidence) şimdilik sadece bilgilendirme amaçlı gösteriliyor, puanlamaya dahil değil -
yanlış pozitif riski olmadan önce gerçek kullanımdan veri toplamak için bilinçli bir tercih.

**Scanner kaynak kodu değiştiğinde** indirilebilir exe'yi yeniden yayınlamak gerekir:

```bash
cd apps/scanner/NexusGuard.Scanner
dotnet publish -c Release -r win-x64 --self-contained true \
  -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true \
  -p:EnableCompressionInSingleFile=true -o publish

cp publish/NexusGuard.Scanner.exe ../../web/nexusguard-dashboard/public/downloads/
```

## Discord bot komutları

- **`/nexusguard-link api-key:<key>`** — çalıştırıldığı Discord sunucusunu bir NexusGuard
  sunucusuna bağlar (API key'i doğrular, bot'un kendi yerel `links.json`'ında saklar — bu
  bilgi NexusGuard'ın veritabanında tutulmaz, bot da diğer istemciler gibi sadece API'yi
  kullanır).
- **`/nexusguard-scan player:<@kullanıcı>`** — bağlı sunucunun API key'iyle bir scan
  oluşturur, hedef kullanıcıya PIN + hazır Scanner.exe komutunu DM ile gönderir.

## Uçtan uca akış (curl ile)

Aşağıdaki örnek, dokümandaki 3. bölümdeki akışı birebir uygular — admin scan oluşturur
(burada API key ile, dashboard/bot'un yaptığı gibi) → PIN üretilir → Scanner PIN'i scan
token ile değiştirir → Scanner heartbeat/result gönderir → tamamlar → sunucu risk skorunu
hesaplar. Kullanıcı/sunucu oluşturma artık normalde Discord login üzerinden oluyor; burada
API key'i zaten elinde varsayıyoruz.

```bash
BASE=http://localhost:5080
API_KEY="ng_xxx..."   # dashboard'da "New server" ya da /nexusguard-link ile aldığın key

# 1) Scan oluştur (admin/dashboard/bot tarafı)
curl -s -X POST $BASE/api/scans \
  -H "X-Api-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"playerIdentifier":"Player01"}'
# => { "scanId": "...", "pin": "123456", "pinExpiresAt": "..." }

SCAN_ID="..."; PIN="123456"

# 2) Scanner.exe rolü: PIN'i scan token ile değiştir
curl -s -X POST $BASE/api/scanner/session \
  -H "Content-Type: application/json" \
  -d "{\"scanId\":\"$SCAN_ID\",\"pin\":\"$PIN\"}"
# => { "scanToken": "...", "expiresAt": "..." }

SCAN_TOKEN="..."

# 3) Heartbeat
curl -s -X POST $BASE/api/scanner/heartbeat \
  -H "Authorization: Bearer $SCAN_TOKEN"

# 4) Sonuç gönder — ham veri, "suspicious" gibi bir yorum alanı yok
curl -s -X POST $BASE/api/scanner/results \
  -H "Authorization: Bearer $SCAN_TOKEN" -H "Content-Type: application/json" \
  -d '{"resultType":"Process","dataJson":"[{\"name\":\"cheatengine\",\"pid\":1234}]"}'

# 5) Tamamla — body YOK, risk skorunu sunucu Detection Engine'i hesaplar
curl -s -X POST $BASE/api/scanner/complete \
  -H "Authorization: Bearer $SCAN_TOKEN"
# => { "riskScore": 30, "detectionCount": 1 }

# 6) Admin sonucu ve tespitleri görüntüler
curl -s $BASE/api/scans/$SCAN_ID -H "X-Api-Key: $API_KEY"
```

## Detection Engine (Phase 5)

`Services/DetectionEngine.cs` — scanner'ın gönderdiği ham `ScanResult` verilerini
(`Process`, `Module`, `File`, `FiveMArtifact`) kendi imza/kural setiyle değerlendirir ve
`Detection` satırları üretir (`RuleId`, `Description`, `Weight`, `Evidence`). Risk skoru bu
tespitlerin ağırlıklarının toplamıdır (0-100 arasına sıkıştırılmış). Scanner'ın kendi
"suspicious" etiketlemesi **hiç kullanılmaz** — böylece değiştirilmiş/atlatılmış bir
scanner kendi kendine "temiz" raporu veremez, çünkü karar hiçbir zaman onun elinde değildi.

Mevcut kurallar: bilinen araç isimleriyle eşleşen process/dosya, FiveM oyun process'ine
kurulum/sistem dizini dışından yüklenen modül, FiveM `plugins` klasöründeki DLL'ler, FiveM
veri dizininde şüpheli anahtar kelime içeren dosyalar. Bunlar hâlâ isim/anahtar-kelime
eşleştirme — gerçek byte-seviyesi imza taraması Phase 7'de YARA ile geldi (aşağıya bkz.).

## YARA taraması (Phase 7)

Scanner, Desktop/Downloads'ta bulduğu ve FiveM `plugins`/kurulum dizinindeki exe/dll
dosyalarını (20MB'a kadar) `POST /api/scanner/files`'a base64 olarak yükler. Sunucu
[dnYara](https://github.com/airbus-cert/dnYara) ile `Yara/rules/*.yar`'daki kuralları bu
dosyaya karşı çalıştırır, eşleşirse `Detection` satırı yazar, **dosyayı hemen siler** —
hiçbir çalıştırılabilir içerik DB'de veya diskte kalıcı olarak saklanmaz.

Kurallar (`Yara/rules/`):
- `cheat_engine.yar` — Cheat Engine'e özgü string/sürücü imzaları
- `generic_injector.yar` — bilinen enjektör araçlarının (Extreme Injector, Xenos, Process
  Hacker) ürün stringleri

Kasıtlı olarak **yok**: genel "VirtualAllocEx + WriteProcessMemory + CreateRemoteThread"
import-eşleşmesi kuralı. Gerçek makinede test edilirken bu kural, her FiveM oyuncusunda
zaten kurulu olan **Rockstar Games Launcher'ın kendi elevation helper'ını**
(`RGL-ElevationHelper.exe`) yanlış pozitif olarak işaretledi — kod imzası doğrulaması
olmadan bu sınıf kural, masum oyuncuların büyük kısmını yanlışlıkla hedef alır. Aynı
şekilde `noclip` gibi genel kelimeler de RAGE Engine'in kendi resmi DLL'lerinde (`imgui.dll`,
`rage-graphics-five.dll`) bulunduğu için kaldırıldı. Bu, "masum oyuncuyu yanlış işaretlemek,
gerçek bir hedefi kaçırmaktan daha kötü" prensibiyle bilinçli bir kapsam kararı — Authenticode
imza kontrolü/yayıncı allowlist'i olmadan geri getirilmemeli.

## AI özet katmanı (Phase 8)

`Services/AiSummaryService.cs` — bir scan tamamlandığında, Detection Engine'in ürettiği
`Detection` satırlarını (kural, açıklama, ağırlık, kanıt) Claude Opus 5'e verip 2-4
cümlelik, admin'in okuyabileceği bir risk değerlendirmesi ürettiriyor. **Kural motorunun
yerini almıyor** — üstüne, teknik bulguları insan diline çeviren bir katman. Girdisi
her zaman sunucunun kendi tespitleri, scanner'ın ham/işlenmemiş verisi değil.

Best-effort: `dotnet user-secrets` ile `Anthropic:ApiKey` ayarlanmamışsa veya çağrı
herhangi bir sebeple (kredi/bakiye, ağ, rate limit) başarısız olursa, özet `null` kalır
ve **scan tamamlanma akışını hiçbir zaman kesmez** — risk skoru ve Detection'lar zaten
bu özet olmadan da yetkilidir. Ayarlamak için:

```bash
cd apps/api/NexusGuard.Api
dotnet user-secrets set "Anthropic:ApiKey" "sk-ant-..."
```

## Auth şemaları (dördü de birbirinden bağımsız)

- **ApiKey** (`X-Api-Key`) — sunucudan sunucuya çağrılar (dashboard, bot, curl), bir
  `Server`'ı temsil eder.
- **ScannerToken** (`Authorization: Bearer`) — Scanner.exe, tek bir aktif `ScanSession`'ı
  temsil eder, PIN karşılığında kısa ömürlü verilir.
- **DashboardSession** (`ng_session` cookie) — Discord'la giriş yapmış bir admin,
  tarayıcıda. Scan/scanner endpoint'lerine asla erişemez; sadece kendi sunucularını
  listeleme/oluşturma ve kaybedilen API key'i login üzerinden kurtarma (rotate) için var.
- Discord bot kendi başına bir auth şeması değil — sadece ApiKey şemasını, `/nexusguard-link`
  ile öğrendiği key'i kullanarak, diğer istemciler gibi kullanıyor.

## Güvenlik notları

- API key, scan token ve dashboard session token'ı **hiçbir zaman** düz metin olarak DB'de
  tutulmuyor — sadece SHA-256 hash (+ API key/scan token için arama amaçlı kısa prefix)
  saklanıyor.
- PIN ve scan token'ın kendi TTL'i var (`appsettings.json` → `ScanTokens`), dashboard
  session'ının da var (→ `UserSessions:TtlDays`, varsayılan 30 gün).
- Scanner, admin endpoint'lerine; dashboard session'ı da scan/scanner endpoint'lerine asla
  erişemiyor — dört ayrı auth şeması var, controller seviyesinde net ayrılmış.
- Scan tamamlanınca token hemen "yakılıyor" (null'lanıyor), TTL dolmasını beklemiyor.
- Risk skoru sunucuda, ham verilerden hesaplanıyor — scanner'ın kendi beyanına güvenilmiyor.
- Discord Client Secret ve Bot Token sadece `dotnet user-secrets` ile saklanıyor, hiçbir
  dosyada düz metin olarak yok.

## Sırada ne var

Dokümandaki mimari fazların (Phase 1-8) tamamı burada. Buradan sonrası artık yeni bir
faz eklemekten çok, mevcut sistemi olgunlaştırmak: Detection Engine kurallarını
genişletmek, YARA kural setini büyütmek, veya Anthropic hesabına kredi ekleyip AI özet
katmanını devreye almak gibi. Ne üzerinde çalışmak istersen söyle.
