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

const POLL_INTERVAL_MS = 3000;
const ACTIVE_STATUSES = new Set(["Pending", "TokenIssued", "InProgress"]);

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

export default function ScanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<ServerSession | null>(null);
  const [detail, setDetail] = useState<ScanSessionDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [revealName, setRevealName] = useState(false);

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
            <h1 className="text-xl font-semibold text-white">{detail.session.playerIdentifier}</h1>
            <StatusBadge status={detail.session.status} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <div>
              <dl className="grid grid-cols-2 gap-4 rounded-lg border border-zinc-800 p-4 sm:grid-cols-4">
                <Field label="Risk skoru" value={detail.session.riskScore?.toString() ?? "—"} />
                <Field label="Oluşturuldu" value={formatDate(detail.session.createdAt)} />
                <Field label="Başladı" value={formatDate(detail.session.startedAt)} />
                <Field label="Tamamlandı" value={formatDate(detail.session.completedAt)} />
              </dl>

              {detail.session.aiSummary && (
                <div className="mt-6 rounded-lg border border-violet-900/40 bg-violet-950/20 p-4">
                  <h2 className="text-sm font-semibold text-violet-400">Yapay zeka risk değerlendirmesi</h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-200">{detail.session.aiSummary}</p>
                </div>
              )}

              {rpfDetections.length > 0 && (
                <>
                  <h2 className="mt-8 text-sm font-semibold text-zinc-300">
                    RPF tespitleri ({rpfDetections.length})
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Bilinen kötü amaçlı RPF adlarıyla birebir eşleşenler ile, arşivin kendi
                    içeriğinde (dosya adına değil) bilinen bir hile/oyun içi değişiklik izine
                    rastlanan RPF&apos;ler.
                  </p>
                  <div className="mt-3 space-y-2">
                    {rpfDetections.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-start gap-3 rounded-lg border border-amber-800/50 bg-amber-950/20 px-4 py-3"
                      >
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

              <h2 className="mt-8 text-sm font-semibold text-zinc-300">
                Tespitler ({otherDetections.length})
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Aşağıdaki ham sonuçlardan sunucu tarafında Detection Engine tarafından hesaplandı -
                scanner&apos;ın kendisi hakkında iddia ettiği hiçbir şeyden değil.
              </p>

              {otherDetections.length === 0 ? (
                <p className="mt-3 rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
                  Hiçbir kural eşleşmedi.
                </p>
              ) : (
                <div className="mt-3 overflow-hidden rounded-lg border border-red-900/40">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-red-950/30 text-zinc-400">
                      <tr>
                        <th className="px-4 py-2 font-medium">Kural</th>
                        <th className="px-4 py-2 font-medium">Açıklama</th>
                        <th className="px-4 py-2 font-medium">Ağırlık</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {otherDetections.map((d: DetectionResponse) => (
                        <tr key={d.id}>
                          <td className="px-4 py-2.5 align-top font-mono text-xs text-red-400">{d.ruleId}</td>
                          <td className="px-4 py-2.5 align-top text-zinc-300">
                            {d.description}
                            <div className="mt-0.5 break-all font-mono text-xs text-zinc-500">{d.evidence}</div>
                          </td>
                          <td className="px-4 py-2.5 align-top text-zinc-400">{d.weight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {usbDevices.length > 0 && (
                <>
                  <h2 className="mt-8 text-sm font-semibold text-zinc-300">
                    USB geçmişi ({usbDevices.length})
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Windows kayıt defterinden okunan, şu an takılı olsun olmasın bu makineye bir
                    kez bağlanmış tüm USB depolama aygıtları - bilgilendirme amaçlı, puanlamaya
                    dahil edilmez.
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
                </>
              )}

              {rpfFiles.length > 0 && (
                <>
                  <h2 className="mt-8 text-sm font-semibold text-zinc-300">
                    RPF dosyaları ({rpfFiles.length})
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    FiveM&apos;in <code className="text-zinc-400">cache</code> ve{" "}
                    <code className="text-zinc-400">mods</code> klasörlerinde bulunan RPF
                    arşivleri, içeriğine bakılarak tahmini olarak sınıflandırıldı - bu sadece bir
                    açıklama, tek başına bir suçlama değil (ör. bir yol/harita paketi de burada
                    görünebilir).
                  </p>
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
                </>
              )}

              <h2 className="mt-8 text-sm font-semibold text-zinc-300">
                Ham sonuçlar ({detail.results.length})
              </h2>

              {detail.results.length === 0 && (
                <p className="mt-3 rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
                  Henüz sonuç gönderilmedi.
                </p>
              )}

              <div className="mt-3 space-y-4">
                {detail.results.map((result) => (
                  <ResultCard key={result.id} result={result} />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 p-4">
              <h2 className="text-sm font-semibold text-zinc-200">Tarama Bilgileri</h2>
              <div className="mt-3 space-y-2.5 text-sm">
                <InfoRow label="PIN" value={pin ?? "—"} mono />
                <InfoRow label="İşletim Sistemi" value={systemFact?.osVersion ?? "—"} />
                <InfoRow
                  label="Bilgisayar Adı"
                  value={
                    systemFact?.machineName
                      ? revealName
                        ? systemFact.machineName
                        : maskName(systemFact.machineName)
                      : "—"
                  }
                  action={
                    systemFact?.machineName ? (
                      <button
                        onClick={() => setRevealName((v) => !v)}
                        className="text-[10px] font-medium text-violet-400 hover:text-violet-300"
                      >
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
                <InfoRow
                  label="Tamamlandı"
                  value={detail.session.completedAt ? formatDate(detail.session.completedAt) : "—"}
                />
              </div>
            </div>
          </div>
        </>
      )}
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
      <span className="text-zinc-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className={mono ? "font-mono text-zinc-200" : "font-medium text-zinc-200"}>{value}</span>
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
