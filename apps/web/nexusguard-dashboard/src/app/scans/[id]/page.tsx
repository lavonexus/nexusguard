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
} from "@/lib/api";
import { loadSession, type ServerSession } from "@/lib/session";
import StatusBadge from "@/components/StatusBadge";
import { classifyRpfContent } from "@/lib/rpfContent";
import { DECISION_COLORS, DECISION_TEXT_CLASS, decisionOf, type Decision } from "@/lib/riskBuckets";

const POLL_INTERVAL_MS = 3000;
const ACTIVE_STATUSES = new Set(["Pending", "TokenIssued", "InProgress"]);

type Section = "overview" | "detections" | "rpf" | "usb" | "firmware" | "raw";

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
        setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı.");
      }
    },
    [params.id]
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
        ← Taramalara dön
      </Link>

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {!detail && !error && <p className="mt-6 text-sm text-zinc-500">Yükleniyor...</p>}

      {detail && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">{detail.session.playerIdentifier}</h1>
              {detail.session.status === "Completed" && (
                <p className="mt-0.5 text-xs text-zinc-500">
                  Uyarı: şüpheli aktivite bulunabilir. Niyeti belirlemek için bulguları tek tek incele.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {pin && (
                <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-zinc-400">
                  PIN <span className="text-zinc-200">{pin}</span>
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
                />
              )}

              {section === "detections" && (
                <DetectionsSection rpfDetections={rpfDetections} otherDetections={otherDetections} />
              )}

              {section === "rpf" && <RpfSection rpfDetections={rpfDetections} rpfFiles={rpfFiles} />}

              {section === "usb" && <UsbSection usbDevices={usbDevices} />}

              {section === "firmware" && firmwareFact && <FirmwareSection fact={firmwareFact} />}

              {section === "raw" && <RawResultsSection results={detail.results} />}
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
}: {
  active: Section;
  onChange: (s: Section) => void;
  detectionCount: number;
  rpfCount: number;
  usbCount: number;
  hasFirmware: boolean;
  rawCount: number;
}) {
  const items: { key: Section; label: string; icon: string; count?: number }[] = [
    { key: "overview", label: "Genel Bakış", icon: "◧" },
    { key: "detections", label: "Tespitler", icon: "🛡", count: detectionCount },
    ...(rpfCount > 0 ? [{ key: "rpf" as const, label: "RPF", icon: "📁", count: rpfCount }] : []),
    ...(usbCount > 0 ? [{ key: "usb" as const, label: "USB", icon: "🔌", count: usbCount }] : []),
    ...(hasFirmware ? [{ key: "firmware" as const, label: "Firmware", icon: "🔧" }] : []),
    { key: "raw", label: "Ham Sonuçlar", icon: "📄", count: rawCount },
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

function RiskGauge({ score, decision }: { score: number | null; decision: Decision }) {
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
          {decision}
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
}: {
  detail: ScanSessionDetailResponse;
  pin: string | null;
  systemFact: SystemFact | null;
  scanDuration: number | null;
  revealName: boolean;
  onToggleRevealName: () => void;
}) {
  const decision = decisionOf(detail.session);
  const cheatCount = detail.detections.filter((d) => d.confidence === "Confirmed" || d.confidence === "High").length;
  const warningCount = detail.detections.length - cheatCount;

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 p-5 sm:flex-row sm:items-center">
        <RiskGauge score={detail.session.riskScore} decision={decision} />
        <div className="flex-1">
          <div className={`text-sm font-bold uppercase tracking-wide ${DECISION_TEXT_CLASS[decision]}`}>
            {decision === "Hile" ? "Hile Tespit Edildi" : decision === "Uyarı" ? "Şüpheli Aktivite" : decision === "Temiz" ? "Temiz" : "Devam Ediyor"}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {detail.detections.length} bulgu tespit edildi - bazı göstergeler manuel inceleme gerektirebilir.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs text-red-300 ring-1 ring-inset ring-red-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Hile {cheatCount}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 ring-1 ring-inset ring-amber-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Uyarı {warningCount}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Temiz {detail.detections.length === 0 ? 1 : 0}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          {detail.session.aiSummary && (
            <div className="rounded-lg border border-violet-900/40 bg-violet-950/20 p-4">
              <h2 className="text-sm font-semibold text-violet-400">Yapay zeka risk değerlendirmesi</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">{detail.session.aiSummary}</p>
            </div>
          )}

          <h2 className="mt-6 text-sm font-semibold text-zinc-300">
            Bulgu Kaydı <span className="text-zinc-600">({detail.detections.length} bulgu)</span>
          </h2>
          {detail.detections.length === 0 ? (
            <p className="mt-3 rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
              Hiçbir kural eşleşmedi.
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

        <div className="min-w-0 rounded-xl border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Tarama Bilgileri</h2>
          <div className="mt-3 space-y-2.5 text-sm">
            <InfoRow label="PIN" value={pin ?? "—"} mono />
            <InfoRow label="İşletim Sistemi" value={systemFact?.osVersion ?? "—"} />
            <InfoRow
              label="Bilgisayar Adı"
              value={
                systemFact?.machineName ? (revealName ? systemFact.machineName : maskName(systemFact.machineName)) : "—"
              }
              action={
                systemFact?.machineName ? (
                  <button onClick={onToggleRevealName} className="text-[10px] font-medium text-violet-400 hover:text-violet-300">
                    {revealName ? "Gizle" : "Göster"}
                  </button>
                ) : undefined
              }
            />
            <InfoRow label="Ülke" value={systemFact?.regionCountry ?? "—"} />
            <InfoRow
              label="Format Tarihi"
              value={systemFact?.windowsInstallDate ? daysAgo(systemFact.windowsInstallDate) : "—"}
            />
            <InfoRow label="Tarama Süresi" value={scanDuration !== null ? `${scanDuration}s` : "—"} />
            <InfoRow label="Tamamlandı" value={detail.session.completedAt ? formatDate(detail.session.completedAt) : "—"} />
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
}: {
  rpfDetections: DetectionResponse[];
  otherDetections: DetectionResponse[];
}) {
  return (
    <div>
      {rpfDetections.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-zinc-300">RPF tespitleri ({rpfDetections.length})</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Bilinen kötü amaçlı RPF adlarıyla birebir eşleşenler ile, arşivin kendi içeriğinde (dosya
            adına değil) bilinen bir hile/oyun içi değişiklik izine rastlanan RPF&apos;ler.
          </p>
          <div className="mt-3 space-y-2">
            {rpfDetections.map((d) => (
              <div key={d.id} className="flex items-start gap-3 rounded-lg border border-amber-800/50 bg-amber-950/20 px-4 py-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500 text-xs font-bold text-black">
                  !
                </span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-amber-500">
                    {d.ruleId === "illegal-rpf" ? "Uyarı · Bilinen Ad" : "Uyarı · İçerik Analizi"}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-amber-200">{d.description}</div>
                  <div className="mt-0.5 break-all font-mono text-xs text-zinc-500">{d.evidence}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-8 text-sm font-semibold text-zinc-300">Tespitler ({otherDetections.length})</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Aşağıdaki ham sonuçlardan sunucu tarafında Detection Engine tarafından hesaplandı - scanner&apos;ın
        kendisi hakkında iddia ettiği hiçbir şeyden değil.
      </p>

      {otherDetections.length === 0 ? (
        <p className="mt-3 rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
          Hiçbir kural eşleşmedi.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-red-900/40">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-red-950/30 text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">Kategori</th>
                <th className="px-4 py-2 font-medium">Açıklama</th>
                <th className="px-4 py-2 font-medium">Durum</th>
                <th className="px-4 py-2 font-medium">Güven</th>
                <th className="px-4 py-2 font-medium">Ağırlık</th>
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
                        {d.publisher && <span>Yayıncı: {d.publisher}</span>}
                        {d.signed !== null && <span>{d.signed ? "İmzalı" : "İmzasız"}</span>}
                        {d.sha256 && <span className="font-mono">SHA-256: {d.sha256.slice(0, 16)}…</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    <DetectionStatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    <DetectionConfidenceBadge confidence={d.confidence} />
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

function RpfSection({ rpfDetections, rpfFiles }: { rpfDetections: DetectionResponse[]; rpfFiles: RpfFact[] }) {
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
                  {d.ruleId === "illegal-rpf" ? "Uyarı · Bilinen Ad" : "Uyarı · İçerik Analizi"}
                </div>
                <div className="mt-0.5 text-sm font-semibold text-amber-200">{d.description}</div>
                <div className="mt-0.5 break-all font-mono text-xs text-zinc-500">{d.evidence}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-sm font-semibold text-zinc-300">RPF dosyaları ({rpfFiles.length})</h2>
      <p className="mt-1 text-xs text-zinc-500">
        FiveM&apos;in <code className="text-zinc-400">cache</code> ve <code className="text-zinc-400">mods</code>{" "}
        klasörlerinde bulunan RPF arşivleri, içeriğine bakılarak tahmini olarak sınıflandırıldı - bu sadece
        bir açıklama, tek başına bir suçlama değil (ör. bir yol/harita paketi de burada görünebilir).
      </p>
      {rpfFiles.length === 0 ? (
        <p className="mt-3 rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
          Hiçbir RPF dosyası bulunamadı.
        </p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">Dosya</th>
                <th className="px-4 py-2 font-medium">Boyut</th>
                <th className="px-4 py-2 font-medium">İçerik</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rpfFiles.map((f, i) => (
                <RpfRow key={i} fact={f} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UsbSection({ usbDevices }: { usbDevices: UsbDeviceFact[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-300">USB geçmişi ({usbDevices.length})</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Windows kayıt defterinden okunan, şu an takılı olsun olmasın bu makineye bir kez bağlanmış tüm USB
        depolama aygıtları - bilgilendirme amaçlı, puanlamaya dahil edilmez.
      </p>
      <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">Aygıt</th>
              <th className="px-4 py-2 font-medium">Son görülme</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {usbDevices.map((u, i) => (
              <tr key={i}>
                <td className="px-4 py-2 text-zinc-300">{u.friendlyName}</td>
                <td className="px-4 py-2 text-zinc-500">{formatDate(u.lastConnectedUtc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FirmwareSection({ fact }: { fact: FirmwareFact }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-300">UEFI / Firmware bilgisi</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Kullanıcı modundan okunabilen birkaç zayıf gösterge - firmware&apos;in kendisinin değiştirilip
        değiştirilmediğini kanıtlamaz (bunun için kernel sürücüsü ya da özel donanım gerekir, NexusGuard
        bunu asla yapmaz). Secure Boot&apos;un kapalı olmasının Linux dual-boot gibi birçok meşru sebebi
        vardır - bilgilendirme amaçlı, puanlamaya dahil edilmez.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-4 rounded-lg border border-zinc-800 p-4 sm:grid-cols-4">
        <Field label="Önyükleme" value={fact.isUefiBoot ? "UEFI" : "Legacy BIOS"} />
        <Field
          label="Secure Boot"
          value={
            !fact.isUefiBoot ? "—" : fact.secureBootEnabled === null ? "Bilinmiyor" : fact.secureBootEnabled ? "Açık" : "Kapalı"
          }
        />
        <Field
          label="TPM"
          value={
            fact.tpmPresent === null
              ? "Bilinmiyor"
              : fact.tpmPresent
                ? `Var${fact.tpmActivated ? " (aktif)" : ""}${fact.tpmSpecVersion ? ` · ${fact.tpmSpecVersion}` : ""}`
                : "Yok"
          }
        />
        <Field label="Firmware önyükleme girişi" value={fact.bootEntries.length.toString()} />
      </div>

      {fact.bootEntries.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">Açıklama</th>
                <th className="px-4 py-2 font-medium">Yol</th>
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

function RawResultsSection({ results }: { results: ScanResultSummaryResponse[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-300">Ham sonuçlar ({results.length})</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Scanner&apos;ın gönderdiği ham veri - her kayıt tipi kendi başına yorumsuzdur, aradaki
        Detection Engine&apos;in ne çıkardığını görmek için Tespitler bölümüne bak.
      </p>

      {results.length === 0 && (
        <p className="mt-3 rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
          Henüz sonuç gönderilmedi.
        </p>
      )}

      <div className="mt-3 space-y-4">
        {results.map((result) => (
          <ResultCard key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
}

// Raw results are exactly what the scanner submitted - unopinionated facts (all processes,
// all loaded modules, ...), not a verdict. Shown collapsed since some of these (Process, in
// particular) can run into the hundreds of rows; the Detections section above is what
// actually says something is wrong.
function ResultCard({ result }: { result: ScanResultSummaryResponse }) {
  const items = parseItems(result.dataJson);

  return (
    <details className="overflow-hidden rounded-lg border border-zinc-800">
      <summary className="flex cursor-pointer list-none items-center justify-between bg-zinc-900 px-4 py-2">
        <span className="text-sm font-medium text-zinc-200">
          {result.resultType} <span className="text-zinc-500">({items.length})</span>
        </span>
        <span className="text-xs text-zinc-500">{formatDate(result.createdAt)}</span>
      </summary>

      {items.length === 0 ? (
        <p className="px-4 py-3 text-sm text-zinc-500">Boş.</p>
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

function RpfRow({ fact }: { fact: RpfFact }) {
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
            <span className="ml-2 text-[10px] text-violet-400">{expanded ? "▲ gizle" : "▼ içindekiler"}</span>
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

function daysAgo(isoDate: string) {
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Bugün";
  if (days === 1) return "1 gün önce";
  return `${days} gün önce`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("tr-TR");
}

function DetectionCategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-block rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
      {category}
    </span>
  );
}

const STATUS_LABELS: Record<string, string> = {
  Active: "Aktif",
  Historical: "Geçmiş",
  Removed: "Kaldırılmış",
  Unknown: "Bilinmiyor",
};

const STATUS_STYLES: Record<string, string> = {
  Active: "border-red-800 bg-red-950/40 text-red-300",
  Historical: "border-amber-800 bg-amber-950/30 text-amber-300",
  Removed: "border-zinc-700 bg-zinc-900 text-zinc-400",
  Unknown: "border-zinc-700 bg-zinc-900 text-zinc-500",
};

function DetectionStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.Unknown;
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${style}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

const CONFIDENCE_LABELS: Record<string, string> = {
  Low: "Düşük",
  Medium: "Orta",
  High: "Yüksek",
  Confirmed: "Doğrulanmış",
};

const CONFIDENCE_STYLES: Record<string, string> = {
  Low: "border-zinc-700 text-zinc-500",
  Medium: "border-amber-800 text-amber-400",
  High: "border-orange-800 text-orange-400",
  Confirmed: "border-red-700 text-red-400",
};

function DetectionConfidenceBadge({ confidence }: { confidence: string }) {
  const style = CONFIDENCE_STYLES[confidence] ?? CONFIDENCE_STYLES.Low;
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${style}`}>{CONFIDENCE_LABELS[confidence] ?? confidence}</span>;
}
