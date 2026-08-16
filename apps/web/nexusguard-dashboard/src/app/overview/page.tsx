"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, listScans, type ScanSessionResponse } from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import ActivityChart, { type ActivityPoint } from "@/components/ActivityChart";
import DecisionDonut from "@/components/DecisionDonut";
import StatusBadge from "@/components/StatusBadge";
import { CHEAT_THRESHOLD, CLEAN_THRESHOLD, DECISION_COLORS } from "@/lib/riskBuckets";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useT, type Dict } from "@/lib/i18n/useT";

const STRINGS: Dict<{
  greeting: string;
  subtitle: string;
  newScan: string;
  apiUnreachable: string;
  totalScans: string;
  detections: string;
  cleanScans: string;
  detectionRate: string;
  activity: string;
  days: string;
  decisionBreakdown: string;
  decisionClean: string;
  decisionWarning: string;
  decisionCheating: string;
  decisionPending: string;
  recentScans: string;
  viewAll: string;
  player: string;
  status: string;
  riskScore: string;
  when: string;
  loading: string;
  noScansYet: string;
  membership: string;
  activeSubscription: string;
  freePlan: string;
  planStatus: string;
  active: string;
  upgradePlan: string;
  systemStatus: string;
  api: string;
  website: string;
  online: string;
  offline: string;
  ready: string;
}> = {
  tr: {
    greeting: "Günaydın",
    subtitle: "İşte tespit özetin.",
    newScan: "Yeni tarama",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    totalScans: "Toplam tarama",
    detections: "Tespitler",
    cleanScans: "Temiz taramalar",
    detectionRate: "Tespit oranı",
    activity: "Tarama etkinliği",
    days: "gün",
    decisionBreakdown: "Karar dağılımı",
    decisionClean: "Temiz",
    decisionWarning: "Uyarı",
    decisionCheating: "Hile",
    decisionPending: "Çalışıyor",
    recentScans: "Son taramalar",
    viewAll: "Tümünü gör →",
    player: "Oyuncu",
    status: "Durum",
    riskScore: "Risk skoru",
    when: "Ne zaman",
    loading: "Yükleniyor...",
    noScansYet: "Henüz tarama yok.",
    membership: "Üyelik",
    activeSubscription: "Aktif abonelik.",
    freePlan: "Ücretsiz plandasın.",
    planStatus: "Durum",
    active: "Aktif",
    upgradePlan: "Planı yükselt",
    systemStatus: "Sistem durumu",
    api: "API",
    website: "Web sitesi",
    online: "ÇEVRİMİÇİ",
    offline: "ÇEVRİMDIŞI",
    ready: "HAZIR",
  },
  en: {
    greeting: "Good morning",
    subtitle: "Here's your detection summary.",
    newScan: "New scan",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    totalScans: "Total scans",
    detections: "Detections",
    cleanScans: "Clean scans",
    detectionRate: "Detection rate",
    activity: "Scan activity",
    days: "days",
    decisionBreakdown: "Decision breakdown",
    decisionClean: "Clean",
    decisionWarning: "Warning",
    decisionCheating: "Cheating",
    decisionPending: "Running",
    recentScans: "Recent scans",
    viewAll: "View all →",
    player: "Player",
    status: "Status",
    riskScore: "Risk score",
    when: "When",
    loading: "Loading...",
    noScansYet: "No scans yet.",
    membership: "Membership",
    activeSubscription: "Active subscription.",
    freePlan: "You're on the Free plan.",
    planStatus: "Status",
    active: "Active",
    upgradePlan: "Upgrade plan",
    systemStatus: "System status",
    api: "API",
    website: "Website",
    online: "ONLINE",
    offline: "OFFLINE",
    ready: "READY",
  },
};

export default function OverviewPage() {
  const router = useRouter();
  const { session, server } = useServerContext();
  const { locale } = useLocale();
  const t = useT(STRINGS);
  const [scans, setScans] = useState<ScanSessionResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<7 | 30>(7);

  useEffect(() => {
    if (session === null) return; // still loading from context
    if (!session) {
      router.replace("/setup");
      return;
    }
    listScans(session.apiKey)
      .then(setScans)
      .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
  }, [session, router, t.apiUnreachable]);

  const stats = useMemo(() => {
    if (!scans) return null;

    const total = scans.length;
    const cheating = scans.filter((s) => (s.riskScore ?? -1) >= CHEAT_THRESHOLD).length;
    const clean = scans.filter((s) => s.status === "Completed" && (s.riskScore ?? 999) < CLEAN_THRESHOLD).length;
    const suspicious = scans.filter(
      (s) => s.status === "Completed" && (s.riskScore ?? -1) >= CLEAN_THRESHOLD && (s.riskScore ?? -1) < CHEAT_THRESHOLD
    ).length;
    const pending = total - clean - suspicious - cheating;
    const detectionRate = total > 0 ? (cheating / total) * 100 : 0;

    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const inLast7 = scans.filter((s) => now - new Date(s.createdAt).getTime() < week).length;
    const inPrev7 = scans.filter((s) => {
      const age = now - new Date(s.createdAt).getTime();
      return age >= week && age < 2 * week;
    }).length;

    return { total, cheating, clean, suspicious, pending, detectionRate, totalDelta: inLast7 - inPrev7 };
  }, [scans]);

  const activityPoints: ActivityPoint[] = useMemo(() => {
    if (!scans) return [];
    const days = rangeDays;
    const buckets = new Map<string, number>();
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, 0);
    }

    for (const s of scans) {
      const key = new Date(s.createdAt).toISOString().slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    return Array.from(buckets.entries()).map(([key, count]) => ({
      label: new Date(key).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR", { day: "2-digit", month: "short" }),
      count,
    }));
  }, [scans, rangeDays, locale]);

  const recentScans = useMemo(() => (scans ?? []).slice(0, 5), [scans]);

  const displayName = session?.serverName ?? "";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            {t.greeting}, {displayName}.
          </h1>
          <p className="mt-1 text-sm text-zinc-400">{t.subtitle}</p>
        </div>
        <button
          onClick={() => router.push("/scans")}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          {t.newScan}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={t.totalScans} value={stats?.total} delta={stats?.totalDelta} />
        <Tile label={t.detections} value={stats?.cheating} tone="danger" />
        <Tile label={t.cleanScans} value={stats?.clean} tone="good" />
        <Tile label={t.detectionRate} value={stats ? `${stats.detectionRate.toFixed(1)}%` : undefined} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">{t.activity}</h2>
            <div className="flex gap-1 rounded-md border border-zinc-800 p-0.5 text-xs">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setRangeDays(d)}
                  className={`rounded px-2.5 py-1 font-medium transition-colors ${
                    rangeDays === d ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {d} {t.days}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            {scans ? <ActivityChart points={activityPoints} /> : <ChartSkeleton />}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">{t.decisionBreakdown}</h2>
          <div className="mt-4">
            {stats ? (
              <DecisionDonut
                buckets={[
                  { label: t.decisionClean, value: stats.clean, color: DECISION_COLORS["Temiz"] },
                  { label: t.decisionWarning, value: stats.suspicious, color: DECISION_COLORS["Uyarı"] },
                  { label: t.decisionCheating, value: stats.cheating, color: DECISION_COLORS["Hile"] },
                  { label: t.decisionPending, value: stats.pending, color: DECISION_COLORS["Çalışıyor"] },
                ]}
              />
            ) : (
              <ChartSkeleton />
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30 lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-200">{t.recentScans}</h2>
            <Link href="/scans" className="text-xs font-medium text-violet-400 hover:text-violet-300">
              {t.viewAll}
            </Link>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-t border-zinc-800 bg-zinc-900/60 text-zinc-500">
              <tr>
                <th className="px-5 py-2 font-medium">{t.player}</th>
                <th className="px-5 py-2 font-medium">{t.status}</th>
                <th className="px-5 py-2 font-medium">{t.riskScore}</th>
                <th className="px-5 py-2 font-medium">{t.when}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {recentScans.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-zinc-500">
                    {scans === null ? t.loading : t.noScansYet}
                  </td>
                </tr>
              )}
              {recentScans.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => router.push(`/scans/${s.id}`)}
                  className="cursor-pointer transition-colors hover:bg-zinc-900/60"
                >
                  <td className="px-5 py-2.5 font-medium text-zinc-200">{s.playerIdentifier}</td>
                  <td className="px-5 py-2.5">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className={`px-5 py-2.5 ${(s.riskScore ?? 0) >= CHEAT_THRESHOLD ? "font-medium text-red-400" : "text-zinc-300"}`}>
                    {s.riskScore ?? "—"}
                  </td>
                  <td className="px-5 py-2.5 text-zinc-500">
                    {new Date(s.createdAt).toLocaleString(locale === "en" ? "en-US" : "tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-200">{t.membership}</h2>
              <span className="rounded border border-violet-800 bg-violet-950/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                {server?.plan ?? "Free"}
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {server?.plan === "Enterprise" ? t.activeSubscription : t.freePlan}
            </p>
            <div className="mt-3 flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs">
              <span className="text-zinc-400">{t.planStatus}</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t.active}
              </span>
            </div>
            {server?.plan !== "Enterprise" && (
              <Link
                href="/pricing"
                className="mt-3 block rounded-md bg-violet-600 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-violet-500"
              >
                {t.upgradePlan}
              </Link>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">{t.systemStatus}</h2>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{t.api}</span>
                <span className={error ? "text-red-400" : "text-emerald-400"}>{error ? t.offline : t.online}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{t.website}</span>
                <span className="text-emerald-400">{t.ready}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  delta,
  tone = "default",
}: {
  label: string;
  value?: string | number;
  delta?: number;
  tone?: "default" | "danger" | "good";
}) {
  const valueColor = tone === "danger" ? "text-red-400" : tone === "good" ? "text-emerald-400" : "text-white";
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-2xl font-semibold ${valueColor}`}>{value ?? "—"}</span>
        {typeof delta === "number" && delta !== 0 && (
          <span className={`text-xs font-medium ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-[220px] animate-pulse rounded-lg bg-zinc-900/60" />;
}
