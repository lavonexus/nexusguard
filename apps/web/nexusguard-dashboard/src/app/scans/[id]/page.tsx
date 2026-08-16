"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  getScan,
  type DetectionResponse,
  type ScanResultSummaryResponse,
  type ScanSessionDetailResponse,
  type ScanSessionResponse,
} from "@/lib/api";
import { loadSession, type ServerSession } from "@/lib/session";
import StatusBadge from "@/components/StatusBadge";
import { classifyRpfContent } from "@/lib/rpfContent";
import { DECISION_COLORS, DECISION_TEXT_CLASS, decisionOf, type Decision } from "@/lib/riskBuckets";
import { useLocale, type Locale } from "@/lib/i18n/LocaleContext";
import { useT, type Dict } from "@/lib/i18n/useT";

const POLL_INTERVAL_MS = 3000;
const ACTIVE_STATUSES = new Set(["Pending", "TokenIssued", "InProgress"]);

type Section = "overview" | "detections" | "rpf" | "usb" | "firmware" | "raw";

type T = (typeof STRINGS)["tr"];

const STRINGS: Dict<{
  backToScans: string;
  loading: string;
  apiUnreachable: string;
  warningNote: string;
  pinLabel: string;
  navOverview: string;
  navDetections: string;
  navRpf: string;
  navUsb: string;
  navFirmware: string;
  navRaw: string;
  decisionCheatDetected: string;
  decisionSuspicious: string;
  decisionClean: string;
  decisionInProgress: string;
  findingsDetected: string;
  cheatBadge: string;
  warningBadge: string;
  cleanBadge: string;
  runningBadge: string;
  aiRiskAssessment: string;
  findingLog: string;
  findingsUnit: string;
  noRulesMatched: string;
  scanInfoTitle: string;
  osLabel: string;
  machineNameLabel: string;
  countryLabel: string;
  formatDateLabel: string;
  scanDurationLabel: string;
  completedLabel: string;
  hide: string;
  show: string;
  accountsTitle: string;
  rpfDetectionsTitle: string;
  rpfDetectionsDesc: string;
  knownNameBadge: string;
  contentAnalysisBadge: string;
  detectionsTitle: string;
  detectionsDesc: string;
  tableCategory: string;
  tableDescription: string;
  tableStatus: string;
  tableConfidence: string;
  tableWeight: string;
  publisherLabel: string;
  signedLabel: string;
  unsignedLabel: string;
  rpfFilesTitle: string;
  rpfFilesDesc: string;
  noRpfFound: string;
  tableFile: string;
  tableSize: string;
  tableContent: string;
  hideContents: string;
  showContents: string;
  usbHistoryTitle: string;
  usbHistoryDesc: string;
  tableDevice: string;
  tableLastSeen: string;
  firmwareTitle: string;
  firmwareDesc: string;
  bootLabel: string;
  secureBootLabel: string;
  tpmLabel: string;
  firmwareBootEntriesLabel: string;
  unknown: string;
  on: string;
  off: string;
  tpmPresent: string;
  tpmAbsent: string;
  tpmActive: string;
  tablePath: string;
  rawResultsTitle: string;
  rawResultsDesc: string;
  noResultsYet: string;
  empty: string;
  today: string;
  oneDayAgo: string;
  daysAgoSuffix: string;
}> = {
  tr: {
    backToScans: "← Taramalara dön",
    loading: "Yükleniyor...",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    warningNote: "Uyarı: şüpheli aktivite bulunabilir. Niyeti belirlemek için bulguları tek tek incele.",
    pinLabel: "PIN",
    navOverview: "Genel Bakış",
    navDetections: "Tespitler",
    navRpf: "RPF",
    navUsb: "USB",
    navFirmware: "Firmware",
    navRaw: "Ham Sonuçlar",
    decisionCheatDetected: "Hile Tespit Edildi",
    decisionSuspicious: "Şüpheli Aktivite",
    decisionClean: "Temiz",
    decisionInProgress: "Devam Ediyor",
    findingsDetected: "bulgu tespit edildi - bazı göstergeler manuel inceleme gerektirebilir.",
    cheatBadge: "Hile",
    warningBadge: "Uyarı",
    cleanBadge: "Temiz",
    runningBadge: "Çalışıyor",
    aiRiskAssessment: "Yapay zeka risk değerlendirmesi",
    findingLog: "Bulgu Kaydı",
    findingsUnit: "bulgu",
    noRulesMatched: "Hiçbir kural eşleşmedi.",
    scanInfoTitle: "Tarama Bilgileri",
    osLabel: "İşletim Sistemi",
    machineNameLabel: "Bilgisayar Adı",
    countryLabel: "Ülke",
    formatDateLabel: "Format Tarihi",
    scanDurationLabel: "Tarama Süresi",
    completedLabel: "Tamamlandı",
    hide: "Gizle",
    show: "Göster",
    accountsTitle: "Hesaplar",
    rpfDetectionsTitle: "RPF tespitleri",
    rpfDetectionsDesc:
      "Bilinen kötü amaçlı RPF adlarıyla birebir eşleşenler ile, arşivin kendi içeriğinde (dosya adına değil) bilinen bir hile/oyun içi değişiklik izine rastlanan RPF'ler.",
    knownNameBadge: "Uyarı · Bilinen Ad",
    contentAnalysisBadge: "Uyarı · İçerik Analizi",
    detectionsTitle: "Tespitler",
    detectionsDesc:
      "Aşağıdaki ham sonuçlardan sunucu tarafında Detection Engine tarafından hesaplandı - scanner'ın kendisi hakkında iddia ettiği hiçbir şeyden değil.",
    tableCategory: "Kategori",
    tableDescription: "Açıklama",
    tableStatus: "Durum",
    tableConfidence: "Güven",
    tableWeight: "Ağırlık",
    publisherLabel: "Yayıncı",
    signedLabel: "İmzalı",
    unsignedLabel: "İmzasız",
    rpfFilesTitle: "RPF dosyaları",
    rpfFilesDesc:
      "FiveM'in cache ve mods klasörlerinde bulunan RPF arşivleri, içeriğine bakılarak tahmini olarak sınıflandırıldı - bu sadece bir açıklama, tek başına bir suçlama değil (ör. bir yol/harita paketi de burada görünebilir).",
    noRpfFound: "Hiçbir RPF dosyası bulunamadı.",
    tableFile: "Dosya",
    tableSize: "Boyut",
    tableContent: "İçerik",
    hideContents: "▲ gizle",
    showContents: "▼ içindekiler",
    usbHistoryTitle: "USB geçmişi",
    usbHistoryDesc:
      "Windows kayıt defterinden okunan, şu an takılı olsun olmasın bu makineye bir kez bağlanmış tüm USB depolama aygıtları - bilgilendirme amaçlı, puanlamaya dahil edilmez.",
    tableDevice: "Aygıt",
    tableLastSeen: "Son görülme",
    firmwareTitle: "UEFI / Firmware bilgisi",
    firmwareDesc:
      "Kullanıcı modundan okunabilen birkaç zayıf gösterge - firmware'in kendisinin değiştirilip değiştirilmediğini kanıtlamaz (bunun için kernel sürücüsü ya da özel donanım gerekir, NexusGuard bunu asla yapmaz). Secure Boot'un kapalı olmasının Linux dual-boot gibi birçok meşru sebebi vardır - bilgilendirme amaçlı, puanlamaya dahil edilmez.",
    bootLabel: "Önyükleme",
    secureBootLabel: "Secure Boot",
    tpmLabel: "TPM",
    firmwareBootEntriesLabel: "Firmware önyükleme girişi",
    unknown: "Bilinmiyor",
    on: "Açık",
    off: "Kapalı",
    tpmPresent: "Var",
    tpmAbsent: "Yok",
    tpmActive: "aktif",
    tablePath: "Yol",
    rawResultsTitle: "Ham sonuçlar",
    rawResultsDesc:
      "Scanner'ın gönderdiği ham veri - her kayıt tipi kendi başına yorumsuzdur, aradaki Detection Engine'in ne çıkardığını görmek için Tespitler bölümüne bak.",
    noResultsYet: "Henüz sonuç gönderilmedi.",
    empty: "Boş.",
    today: "Bugün",
    oneDayAgo: "1 gün önce",
    daysAgoSuffix: "gün önce",
  },
  en: {
    backToScans: "← Back to scans",
    loading: "Loading...",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    warningNote: "Warning: suspicious activity may be present. Review each finding individually to determine intent.",
    pinLabel: "PIN",
    navOverview: "Overview",
    navDetections: "Detections",
    navRpf: "RPF",
    navUsb: "USB",
    navFirmware: "Firmware",
    navRaw: "Raw Results",
    decisionCheatDetected: "Cheat Detected",
    decisionSuspicious: "Suspicious Activity",
    decisionClean: "Clean",
    decisionInProgress: "In Progress",
    findingsDetected: "findings detected - some indicators may need manual review.",
    cheatBadge: "Cheating",
    warningBadge: "Warning",
    cleanBadge: "Clean",
    runningBadge: "Running",
    aiRiskAssessment: "AI risk assessment",
    findingLog: "Finding Log",
    findingsUnit: "findings",
    noRulesMatched: "No rules matched.",
    scanInfoTitle: "Scan Info",
    osLabel: "Operating System",
    machineNameLabel: "Machine Name",
    countryLabel: "Country",
    formatDateLabel: "Format Date",
    scanDurationLabel: "Scan Duration",
    completedLabel: "Completed",
    hide: "Hide",
    show: "Show",
    accountsTitle: "Accounts",
    rpfDetectionsTitle: "RPF detections",
    rpfDetectionsDesc:
      "Exact matches against known malicious RPF names, plus RPFs whose own content (not filename) matched a known cheat/game-modification signature.",
    knownNameBadge: "Warning · Known Name",
    contentAnalysisBadge: "Warning · Content Analysis",
    detectionsTitle: "Detections",
    detectionsDesc:
      "Computed server-side by the Detection Engine from the raw results below - not from anything the scanner itself claims about itself.",
    tableCategory: "Category",
    tableDescription: "Description",
    tableStatus: "Status",
    tableConfidence: "Confidence",
    tableWeight: "Weight",
    publisherLabel: "Publisher",
    signedLabel: "Signed",
    unsignedLabel: "Unsigned",
    rpfFilesTitle: "RPF files",
    rpfFilesDesc:
      "RPF archives found in FiveM's cache and mods folders, classified by an estimate based on their content - this is descriptive only, not an accusation on its own (e.g. a road/map pack can show up here too).",
    noRpfFound: "No RPF files found.",
    tableFile: "File",
    tableSize: "Size",
    tableContent: "Content",
    hideContents: "▲ hide",
    showContents: "▼ contents",
    usbHistoryTitle: "USB history",
    usbHistoryDesc:
      "All USB storage devices ever connected to this machine, read from the Windows registry, whether currently plugged in or not - informational only, never scored.",
    tableDevice: "Device",
    tableLastSeen: "Last seen",
    firmwareTitle: "UEFI / Firmware info",
    firmwareDesc:
      "A handful of weak indicators readable from user mode - doesn't prove whether the firmware itself was tampered with (that would require a kernel driver or special hardware, which NexusGuard never does). Secure Boot being off has many legitimate reasons, like a Linux dual-boot - informational only, never scored.",
    bootLabel: "Boot",
    secureBootLabel: "Secure Boot",
    tpmLabel: "TPM",
    firmwareBootEntriesLabel: "Firmware boot entries",
    unknown: "Unknown",
    on: "On",
    off: "Off",
    tpmPresent: "Present",
    tpmAbsent: "Absent",
    tpmActive: "active",
    tablePath: "Path",
    rawResultsTitle: "Raw results",
    rawResultsDesc:
      "Raw data submitted by the scanner - each record type is uninterpreted on its own, see the Detections section for what the Detection Engine derived from it.",
    noResultsYet: "No results submitted yet.",
    empty: "Empty.",
    today: "Today",
    oneDayAgo: "1 day ago",
    daysAgoSuffix: "days ago",
  },
};

interface SystemFact {
  osVersion: string;
  machineName: string;
  fiveMProcessFound: boolean;
  windowsInstallDate: string | null;
  regionCountry: string | null;
}

interface UsbDeviceFact {
  friendlyName: string;
  deviceId: string;
  lastConnectedUtc: string | null;
}

interface RpfFact {
  name: string;
  path: string;
  sizeBytes: number;
  sha256: string;
  entries: string[];
}

interface FirmwareBootEntry {
  identifier: string;
  description: string | null;
  path: string | null;
}

interface FirmwareFact {
  isUefiBoot: boolean;
  secureBootEnabled: boolean | null;
  tpmPresent: boolean | null;
  tpmEnabled: boolean | null;
  tpmActivated: boolean | null;
  tpmSpecVersion: string | null;
  bootEntries: FirmwareBootEntry[];
}

export default function ScanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { locale } = useLocale();
  const t = useT(STRINGS);
  const [session, setSession] = useState<ServerSession | null>(null);
  const [detail, setDetail] = useState<ScanSessionDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [revealName, setRevealName] = useState(false);
  const [section, setSection] = useState<Section>("overview");

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/setup");
      return;
    }
    setSession(s);

    const stored = sessionStorage.getItem(`nexusguard.activeScan.${s.serverId}`);
    if (stored) {
      try {
        const active = JSON.parse(stored);
        if (active.scanId === params.id) setPin(active.pin);
      } catch {
        // ignore malformed storage
      }
    }
  }, [router, params.id]);

  const refresh = useCallback(
    async (apiKey: string) => {
      try {
        const data = await getScan(apiKey, params.id);
        setDetail(data);
        setError(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t.apiUnreachable);
      }
    },
    [params.id, t.apiUnreachable]
  );

  useEffect(() => {
    if (!session) return;
    refresh(session.apiKey);

    if (!detail || ACTIVE_STATUSES.has(detail.session.status)) {
      const interval = setInterval(() => refresh(session.apiKey), POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [session, refresh, detail?.session.status]);

  const systemFact = useMemo<SystemFact | null>(() => {
    const result = detail?.results.find((r) => r.resultType === "System");
    if (!result) return null;
    const items = parseItems(result.dataJson);
    return (items[0] as unknown as SystemFact) ?? null;
  }, [detail]);

  const usbDevices = useMemo<UsbDeviceFact[]>(() => {
    const result = detail?.results.find((r) => r.resultType === "UsbHistory");
    if (!result) return [];
    return parseItems(result.dataJson) as unknown as UsbDeviceFact[];
  }, [detail]);

  const rpfFiles = useMemo<RpfFact[]>(() => {
    const result = detail?.results.find((r) => r.resultType === "Rpf");
    if (!result) return [];
    return parseItems(result.dataJson) as unknown as RpfFact[];
  }, [detail]);

  const firmwareFact = useMemo<FirmwareFact | null>(() => {
    const result = detail?.results.find((r) => r.resultType === "Firmware");
    if (!result) return null;
    const items = parseItems(result.dataJson);
    return (items[0] as unknown as FirmwareFact) ?? null;
  }, [detail]);

  const rpfRuleIds = ["illegal-rpf", "suspicious-rpf-content"];
  const rpfDetections = useMemo(
    () => detail?.detections.filter((d) => rpfRuleIds.includes(d.ruleId)) ?? [],
    [detail]
  );
  const otherDetections = useMemo(
    () => detail?.detections.filter((d) => !rpfRuleIds.includes(d.ruleId)) ?? [],
    [detail]
  );

  const scanDuration = useMemo(() => {
    if (!detail?.session.startedAt || !detail?.session.completedAt) return null;
    const ms = new Date(detail.session.completedAt).getTime() - new Date(detail.session.startedAt).getTime();
    return Math.round(ms / 1000);
  }, [detail]);

  if (!session) return null;

  return (
    <div>
      <Link href="/scans" className="text-sm text-zinc-400 hover:text-zinc-200">
        {t.backToScans}
      </Link>

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {!detail && !error && <p className="mt-6 text-sm text-zinc-500">{t.loading}</p>}

      {detail && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">{detail.session.playerIdentifier}</h1>
              {detail.session.status === "Completed" && (
                <p className="mt-0.5 text-xs text-zinc-500">{t.warningNote}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {pin && (
                <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-zinc-400">
                  {t.pinLabel} <span className="text-zinc-200">{pin}</span>
                </span>
              )}
              <StatusBadge status={detail.session.status} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr]">
            <CategoryNav
              active={section}
              onChange={setSection}
              detectionCount={otherDetections.length + rpfDetections.length}
              rpfCount={rpfFiles.length + rpfDetections.length}
              usbCount={usbDevices.length}
              hasFirmware={!!firmwareFact}
              rawCount={detail.results.length}
              t={t}
            />

            <div className="min-w-0">
              {section === "overview" && (
                <OverviewSection
                  detail={detail}
                  pin={pin}
                  systemFact={systemFact}
                  scanDuration={scanDuration}
                  revealName={revealName}
                  onToggleRevealName={() => setRevealName((v) => !v)}
                  t={t}
                  locale={locale}
                />
              )}

              {section === "detections" && (
                <DetectionsSection rpfDetections={rpfDetections} otherDetections={otherDetections} t={t} locale={locale} />
              )}

              {section === "rpf" && <RpfSection rpfDetections={rpfDetections} rpfFiles={rpfFiles} t={t} />}

              {section === "usb" && <UsbSection usbDevices={usbDevices} t={t} locale={locale} />}

              {section === "firmware" && firmwareFact && <FirmwareSection fact={firmwareFact} t={t} />}

              {section === "raw" && <RawResultsSection results={detail.results} t={t} locale={locale} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Sidebar category navigation - mirrors how the platform-wide admin scan view groups things,
// but scoped to this one scan's own sections. Sections with nothing to show (no RPF/USB/
// firmware facts) are simply omitted rather than shown empty.
function CategoryNav({
  active,
  onChange,
  detectionCount,
  rpfCount,
  usbCount,
  hasFirmware,
  rawCount,
  t,
}: {
  active: Section;
  onChange: (s: Section) => void;
  detectionCount: number;
  rpfCount: number;
  usbCount: number;
  hasFirmware: boolean;
  rawCount: number;
  t: T;
}) {
  const items: { key: Section; label: string; icon: string; count?: number }[] = [
    { key: "overview", label: t.navOverview, icon: "◧" },
    { key: "detections", label: t.navDetections, icon: "🛡", count: detectionCount },
    ...(rpfCount > 0 ? [{ key: "rpf" as const, label: t.navRpf, icon: "📁", count: rpfCount }] : []),
    ...(usbCount > 0 ? [{ key: "usb" as const, label: t.navUsb, icon: "🔌", count: usbCount }] : []),
    ...(hasFirmware ? [{ key: "firmware" as const, label: t.navFirmware, icon: "🔧" }] : []),
    { key: "raw", label: t.navRaw, icon: "📄", count: rawCount },
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto lg:block lg:space-y-0.5 lg:overflow-visible">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={`flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors lg:w-full ${
            active === item.key ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-xs">{item.icon}</span>
            {item.label}
          </span>
          {item.count !== undefined && (
            <span className="rounded bg-zinc-950 px-1.5 py-0.5 text-[10px] text-zinc-500">{item.count}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

const DECISION_BADGE_KEY: Record<Decision, keyof T> = {
  Hile: "cheatBadge",
  Uyarı: "warningBadge",
  Temiz: "cleanBadge",
  Çalışıyor: "runningBadge",
};

function RiskGauge({ score, decision, t }: { score: number | null; decision: Decision; t: T }) {
  const color = DECISION_COLORS[decision];
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score ?? 0)) / 100;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#27272a" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-white">{score ?? "—"}</span>
        <span className={`mt-0.5 text-[10px] font-bold uppercase tracking-wide ${DECISION_TEXT_CLASS[decision]}`}>
          {t[DECISION_BADGE_KEY[decision]]}
        </span>
      </div>
    </div>
  );
}

function OverviewSection({
  detail,
  pin,
  systemFact,
  scanDuration,
  revealName,
  onToggleRevealName,
  t,
  locale,
}: {
  detail: ScanSessionDetailResponse;
  pin: string | null;
  systemFact: SystemFact | null;
  scanDuration: number | null;
  revealName: boolean;
  onToggleRevealName: () => void;
  t: T;
  locale: Locale;
}) {
  const decision = decisionOf(detail.session);
  const cheatCount = detail.detections.filter((d) => d.confidence === "Confirmed" || d.confidence === "High").length;
  const warningCount = detail.detections.length - cheatCount;
  const decisionHeadline =
    decision === "Hile"
      ? t.decisionCheatDetected
      : decision === "Uyarı"
        ? t.decisionSuspicious
        : decision === "Temiz"
          ? t.decisionClean
          : t.decisionInProgress;

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 p-5 sm:flex-row sm:items-center">
        <RiskGauge score={detail.session.riskScore} decision={decision} t={t} />
        <div className="flex-1">
          <div className={`text-sm font-bold uppercase tracking-wide ${DECISION_TEXT_CLASS[decision]}`}>
            {decisionHeadline}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {detail.detections.length} {t.findingsDetected}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs text-red-300 ring-1 ring-inset ring-red-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {t.cheatBadge} {cheatCount}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 ring-1 ring-inset ring-amber-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {t.warningBadge} {warningCount}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {t.cleanBadge} {detail.detections.length === 0 ? 1 : 0}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          {detail.session.aiSummary && (
            <div className="rounded-lg border border-violet-900/40 bg-violet-950/20 p-4">
              <h2 className="text-sm font-semibold text-violet-400">{t.aiRiskAssessment}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">{detail.session.aiSummary}</p>
            </div>
          )}

          <h2 className="mt-6 text-sm font-semibold text-zinc-300">
            {t.findingLog} <span className="text-zinc-600">({detail.detections.length} {t.findingsUnit})</span>
          </h2>
          {detail.detections.length === 0 ? (
            <p className="mt-3 rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
              {t.noRulesMatched}
            </p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {[...detail.detections]
                .sort((a, b) => b.weight - a.weight)
                .map((d) => (
                  <FindingRow key={d.id} detection={d} />
                ))}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <AccountsCard session={detail.session} t={t} />

          <div className="rounded-xl border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">{t.scanInfoTitle}</h2>
          <div className="mt-3 space-y-2.5 text-sm">
            <InfoRow label={t.pinLabel} value={pin ?? "—"} mono />
            <InfoRow label={t.osLabel} value={systemFact?.osVersion ?? "—"} />
            <InfoRow
              label={t.machineNameLabel}
              value={
                systemFact?.machineName ? (revealName ? systemFact.machineName : maskName(systemFact.machineName)) : "—"
              }
              action={
                systemFact?.machineName ? (
                  <button onClick={onToggleRevealName} className="text-[10px] font-medium text-violet-400 hover:text-violet-300">
                    {revealName ? t.hide : t.show}
                  </button>
                ) : undefined
              }
            />
            <InfoRow label={t.countryLabel} value={systemFact?.regionCountry ?? "—"} />
            <InfoRow
              label={t.formatDateLabel}
              value={systemFact?.windowsInstallDate ? daysAgo(systemFact.windowsInstallDate, t) : "—"}
            />
            <InfoRow label={t.scanDurationLabel} value={scanDuration !== null ? `${scanDuration}s` : "—"} />
            <InfoRow label={t.completedLabel} value={detail.session.completedAt ? formatDate(detail.session.completedAt, locale) : "—"} />
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// A compact, single-line-per-finding summary (icon + category + description + a checkmark to
// show it's been recorded) - the detailed table with status/confidence/weight columns still
// lives on the Tespitler section for anyone who needs the full picture.
function FindingRow({ detection }: { detection: DetectionResponse }) {
  const isHigh = detection.confidence === "Confirmed" || detection.confidence === "High";
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
        isHigh ? "border-red-900/40 bg-red-950/10" : "border-amber-900/30 bg-amber-950/10"
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${
          isHigh ? "bg-red-500 text-black" : "bg-amber-500 text-black"
        }`}
      >
        !
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <DetectionCategoryBadge category={detection.category} />
          <span className="truncate text-sm font-medium text-zinc-200">{detection.description}</span>
        </div>
      </div>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
        ✓
      </span>
    </div>
  );
}

function DetectionsSection({
  rpfDetections,
  otherDetections,
  t,
  locale,
}: {
  rpfDetections: DetectionResponse[];
  otherDetections: DetectionResponse[];
  t: T;
  locale: Locale;
}) {
  return (
    <div>
      {rpfDetections.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-zinc-300">{t.rpfDetectionsTitle} ({rpfDetections.length})</h2>
          <p className="mt-1 text-xs text-zinc-500">{t.rpfDetectionsDesc}</p>
          <div className="mt-3 space-y-2">
            {rpfDetections.map((d) => (
              <div key={d.id} className="flex items-start gap-3 rounded-lg border border-amber-800/50 bg-amber-950/20 px-4 py-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500 text-xs font-bold text-black">
                  !
                </span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-amber-500">
                    {d.ruleId === "illegal-rpf" ? t.knownNameBadge : t.contentAnalysisBadge}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-amber-200">{d.description}</div>
                  <div className="mt-0.5 break-all font-mono text-xs text-zinc-500">{d.evidence}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-8 text-sm font-semibold text-zinc-300">{t.detectionsTitle} ({otherDetections.length})</h2>
      <p className="mt-1 text-xs text-zinc-500">{t.detectionsDesc}</p>

      {otherDetections.length === 0 ? (
        <p className="mt-3 rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
          {t.noRulesMatched}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-red-900/40">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-red-950/30 text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">{t.tableCategory}</th>
                <th className="px-4 py-2 font-medium">{t.tableDescription}</th>
                <th className="px-4 py-2 font-medium">{t.tableStatus}</th>
                <th className="px-4 py-2 font-medium">{t.tableConfidence}</th>
                <th className="px-4 py-2 font-medium">{t.tableWeight}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {otherDetections.map((d: DetectionResponse) => (
                <tr key={d.id}>
                  <td className="px-4 py-2.5 align-top">
                    <DetectionCategoryBadge category={d.category} />
                  </td>
                  <td className="px-4 py-2.5 align-top text-zinc-300">
                    <div className="font-mono text-[10px] text-zinc-600">{d.ruleId}</div>
                    {d.description}
                    <div className="mt-0.5 break-all font-mono text-xs text-zinc-500">{d.evidence}</div>
                    {(d.publisher || d.sha256) && (
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-600">
                        {d.publisher && <span>{t.publisherLabel}: {d.publisher}</span>}
                        {d.signed !== null && <span>{d.signed ? t.signedLabel : t.unsignedLabel}</span>}
                        {d.sha256 && <span className="font-mono">SHA-256: {d.sha256.slice(0, 16)}…</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    <DetectionStatusBadge status={d.status} locale={locale} />
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    <DetectionConfidenceBadge confidence={d.confidence} locale={locale} />
                  </td>
                  <td className="px-4 py-2.5 align-top text-zinc-400">{d.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RpfSection({ rpfDetections, rpfFiles, t }: { rpfDetections: DetectionResponse[]; rpfFiles: RpfFact[]; t: T }) {
  return (
    <div>
      {rpfDetections.length > 0 && (
        <div className="mb-6 space-y-2">
          {rpfDetections.map((d) => (
            <div key={d.id} className="flex items-start gap-3 rounded-lg border border-amber-800/50 bg-amber-950/20 px-4 py-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500 text-xs font-bold text-black">
                !
              </span>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-amber-500">
                  {d.ruleId === "illegal-rpf" ? t.knownNameBadge : t.contentAnalysisBadge}
                </div>
                <div className="mt-0.5 text-sm font-semibold text-amber-200">{d.description}</div>
                <div className="mt-0.5 break-all font-mono text-xs text-zinc-500">{d.evidence}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-sm font-semibold text-zinc-300">{t.rpfFilesTitle} ({rpfFiles.length})</h2>
      <p className="mt-1 text-xs text-zinc-500">{t.rpfFilesDesc}</p>
      {rpfFiles.length === 0 ? (
        <p className="mt-3 rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
          {t.noRpfFound}
        </p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">{t.tableFile}</th>
                <th className="px-4 py-2 font-medium">{t.tableSize}</th>
                <th className="px-4 py-2 font-medium">{t.tableContent}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rpfFiles.map((f, i) => (
                <RpfRow key={i} fact={f} t={t} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UsbSection({ usbDevices, t, locale }: { usbDevices: UsbDeviceFact[]; t: T; locale: Locale }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-300">{t.usbHistoryTitle} ({usbDevices.length})</h2>
      <p className="mt-1 text-xs text-zinc-500">{t.usbHistoryDesc}</p>
      <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">{t.tableDevice}</th>
              <th className="px-4 py-2 font-medium">{t.tableLastSeen}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {usbDevices.map((u, i) => (
              <tr key={i}>
                <td className="px-4 py-2 text-zinc-300">{u.friendlyName}</td>
                <td className="px-4 py-2 text-zinc-500">{formatDate(u.lastConnectedUtc, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FirmwareSection({ fact, t }: { fact: FirmwareFact; t: T }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-300">{t.firmwareTitle}</h2>
      <p className="mt-1 text-xs text-zinc-500">{t.firmwareDesc}</p>
      <div className="mt-3 grid grid-cols-2 gap-4 rounded-lg border border-zinc-800 p-4 sm:grid-cols-4">
        <Field label={t.bootLabel} value={fact.isUefiBoot ? "UEFI" : "Legacy BIOS"} />
        <Field
          label={t.secureBootLabel}
          value={
            !fact.isUefiBoot ? "—" : fact.secureBootEnabled === null ? t.unknown : fact.secureBootEnabled ? t.on : t.off
          }
        />
        <Field
          label={t.tpmLabel}
          value={
            fact.tpmPresent === null
              ? t.unknown
              : fact.tpmPresent
                ? `${t.tpmPresent}${fact.tpmActivated ? ` (${t.tpmActive})` : ""}${fact.tpmSpecVersion ? ` · ${fact.tpmSpecVersion}` : ""}`
                : t.tpmAbsent
          }
        />
        <Field label={t.firmwareBootEntriesLabel} value={fact.bootEntries.length.toString()} />
      </div>

      {fact.bootEntries.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">{t.tableDescription}</th>
                <th className="px-4 py-2 font-medium">{t.tablePath}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {fact.bootEntries.map((e, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-zinc-300">{e.description ?? e.identifier}</td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500">{e.path ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RawResultsSection({ results, t, locale }: { results: ScanResultSummaryResponse[]; t: T; locale: Locale }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-300">{t.rawResultsTitle} ({results.length})</h2>
      <p className="mt-1 text-xs text-zinc-500">{t.rawResultsDesc}</p>

      {results.length === 0 && (
        <p className="mt-3 rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
          {t.noResultsYet}
        </p>
      )}

      <div className="mt-3 space-y-4">
        {results.map((result) => (
          <ResultCard key={result.id} result={result} t={t} locale={locale} />
        ))}
      </div>
    </div>
  );
}

// Raw results are exactly what the scanner submitted - unopinionated facts (all processes,
// all loaded modules, ...), not a verdict. Shown collapsed since some of these (Process, in
// particular) can run into the hundreds of rows; the Detections section above is what
// actually says something is wrong.
function ResultCard({ result, t, locale }: { result: ScanResultSummaryResponse; t: T; locale: Locale }) {
  const items = parseItems(result.dataJson);

  return (
    <details className="overflow-hidden rounded-lg border border-zinc-800">
      <summary className="flex cursor-pointer list-none items-center justify-between bg-zinc-900 px-4 py-2">
        <span className="text-sm font-medium text-zinc-200">
          {result.resultType} <span className="text-zinc-500">({items.length})</span>
        </span>
        <span className="text-xs text-zinc-500">{formatDate(result.createdAt, locale)}</span>
      </summary>

      {items.length === 0 ? (
        <p className="px-4 py-3 text-sm text-zinc-500">{t.empty}</p>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-zinc-800">
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="px-4 py-1.5 font-mono text-xs break-all text-zinc-400">
                    {summarizeItem(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}

function RpfRow({ fact, t }: { fact: RpfFact; t: T }) {
  const [expanded, setExpanded] = useState(false);
  const content = classifyRpfContent(fact.name, fact.entries ?? []);

  return (
    <>
      <tr className={fact.entries?.length ? "cursor-pointer hover:bg-zinc-900/60" : ""} onClick={() => fact.entries?.length && setExpanded((v) => !v)}>
        <td className="px-4 py-2.5 align-top">
          <span className="font-mono text-xs text-zinc-200">{fact.name}</span>
          <div className="mt-0.5 break-all font-mono text-[11px] text-zinc-600">{fact.path}</div>
        </td>
        <td className="px-4 py-2.5 align-top whitespace-nowrap text-zinc-400">{formatBytes(fact.sizeBytes)}</td>
        <td className="px-4 py-2.5 align-top text-zinc-300">
          {content}
          {fact.entries?.length > 0 && (
            <span className="ml-2 text-[10px] text-violet-400">{expanded ? t.hideContents : t.showContents}</span>
          )}
        </td>
      </tr>
      {expanded && fact.entries?.length > 0 && (
        <tr>
          <td colSpan={3} className="bg-zinc-900/40 px-4 py-2">
            <div className="flex flex-wrap gap-1.5">
              {fact.entries.map((e, i) => (
                <span key={i} className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                  {e}
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function parseItems(dataJson: string): Record<string, unknown>[] {
  try {
    const parsed = JSON.parse(dataJson);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function summarizeItem(item: Record<string, unknown>): string {
  return Object.entries(item)
    .map(([key, value]) => `${key}=${value}`)
    .join("  ");
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-200">{value}</dd>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  action,
}: {
  label: string;
  value: string;
  mono?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-zinc-900 pb-2 last:border-0 last:pb-0">
      <span className="shrink-0 text-zinc-500">{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span
          title={value}
          className={`truncate ${mono ? "font-mono text-zinc-200" : "font-medium text-zinc-200"}`}
        >
          {value}
        </span>
        {action}
      </div>
    </div>
  );
}

function maskName(name: string) {
  if (name.length <= 2) return "•".repeat(name.length);
  return name.slice(0, 2) + " " + "•".repeat(Math.max(6, name.length - 2));
}

function daysAgo(isoDate: string, t: T) {
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return t.today;
  if (days === 1) return t.oneDayAgo;
  return `${days} ${t.daysAgoSuffix}`;
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return "—";
  return new Date(value).toLocaleString(locale === "en" ? "en-US" : "tr-TR");
}

function DetectionCategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-block rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
      {category}
    </span>
  );
}

const STATUS_LABELS: Dict<Record<string, string>> = {
  tr: { Active: "Aktif", Historical: "Geçmiş", Removed: "Kaldırılmış", Unknown: "Bilinmiyor" },
  en: { Active: "Active", Historical: "Historical", Removed: "Removed", Unknown: "Unknown" },
};

const STATUS_STYLES: Record<string, string> = {
  Active: "border-red-800 bg-red-950/40 text-red-300",
  Historical: "border-amber-800 bg-amber-950/30 text-amber-300",
  Removed: "border-zinc-700 bg-zinc-900 text-zinc-400",
  Unknown: "border-zinc-700 bg-zinc-900 text-zinc-500",
};

function DetectionStatusBadge({ status, locale }: { status: string; locale: Locale }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.Unknown;
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${style}`}>
      {STATUS_LABELS[locale][status] ?? status}
    </span>
  );
}

const CONFIDENCE_LABELS: Dict<Record<string, string>> = {
  tr: { Low: "Düşük", Medium: "Orta", High: "Yüksek", Confirmed: "Doğrulanmış" },
  en: { Low: "Low", Medium: "Medium", High: "High", Confirmed: "Confirmed" },
};

const CONFIDENCE_STYLES: Record<string, string> = {
  Low: "border-zinc-700 text-zinc-500",
  Medium: "border-amber-800 text-amber-400",
  High: "border-orange-800 text-orange-400",
  Confirmed: "border-red-700 text-red-400",
};

// Shown only when the scan actually has an identity attached - most scans have neither (no
// Discord bot involved, Steam wasn't running). Discord identity only ever comes from the admin
// picking a member through Discord's own /nexusguard-scan command; Steam identity only ever
// comes from the local Steam client's own registry key + its public Web API - neither is ever
// scraped from the player's live session, see ScanSession's own comments on the API side.
function AccountsCard({ session, t }: { session: ScanSessionResponse; t: T }) {
  if (!session.discordUserId && !session.steamId64) return null;

  return (
    <div className="rounded-xl border border-zinc-800 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">{t.accountsTitle}</h2>
      <div className="mt-3 space-y-3">
        {session.discordUserId && (
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5865F2]/15 text-[#5865F2]">
              <DiscordMark className="h-4 w-4" />
            </span>
            {session.discordAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.discordAvatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : null}
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-zinc-200">{session.discordUsername}</div>
              <div className="truncate font-mono text-[11px] text-zinc-600">{session.discordUserId}</div>
            </div>
          </div>
        )}

        {session.steamId64 && (
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1b2838] text-[#66c0f4]">
              <SteamMark className="h-4 w-4" />
            </span>
            {session.steamAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.steamAvatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : null}
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-zinc-200">{session.steamUsername ?? "—"}</div>
              <div className="truncate font-mono text-[11px] text-zinc-600">{session.steamId64}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DiscordMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M20.3 4.9A19.8 19.8 0 0 0 15.6 3.4c-.2.4-.5.9-.6 1.3a18.3 18.3 0 0 0-5.5 0c-.2-.4-.4-.9-.6-1.3a19.7 19.7 0 0 0-4.7 1.5C1.7 8.9 1 12.8 1.3 16.6a19.9 19.9 0 0 0 6 3c.5-.6.9-1.3 1.3-2-.7-.3-1.4-.6-2-1.1l.5-.4a14.2 14.2 0 0 0 12 0l.4.4c-.6.4-1.3.8-2 1.1.4.7.8 1.4 1.3 2a19.8 19.8 0 0 0 6-3c.4-4.4-.7-8.3-2.9-11.7ZM9 14.6c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Zm6 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Z" />
    </svg>
  );
}

function SteamMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C6.9 2 2.7 5.9 2.1 10.8l5.3 2.2a2.8 2.8 0 0 1 1.6-.5l2.3-3.4v-.1a3.5 3.5 0 1 1 3.5 3.5h-.1l-3.3 2.4a2.8 2.8 0 0 1-5.5.8l-3.8-1.6C3 19.6 7.1 22 12 22a10 10 0 0 0 0-20Zm-2.7 15.2-1.2-.5a2.1 2.1 0 0 0 2.7 1.3 2.1 2.1 0 0 0 1.2-2.7 2.1 2.1 0 0 0-2.7-1.2l1.3.5a1.6 1.6 0 0 1-1.3 2.9Zm7.2-7.7a2.3 2.3 0 1 0 0-4.7 2.3 2.3 0 0 0 0 4.7Zm0-.8a1.6 1.6 0 1 1 0-3.1 1.6 1.6 0 0 1 0 3.1Z" />
    </svg>
  );
}

function DetectionConfidenceBadge({ confidence, locale }: { confidence: string; locale: Locale }) {
  const style = CONFIDENCE_STYLES[confidence] ?? CONFIDENCE_STYLES.Low;
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${style}`}>
      {CONFIDENCE_LABELS[locale][confidence] ?? confidence}
    </span>
  );
}
