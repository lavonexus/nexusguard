"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, getServerOverview, type ServerOverviewResponse } from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { DECISION_COLORS, type Decision } from "@/lib/riskBuckets";
import { useT, type Dict } from "@/lib/i18n/useT";
import EnterpriseGate from "@/components/EnterpriseGate";
import ActivityChart from "@/components/ActivityChart";
import DecisionDonut from "@/components/DecisionDonut";

const STRINGS: Dict<{
  title: string;
  subtitle: string;
  apiUnreachable: string;
  members: string;
  seatsUsed: string;
  totalScans: string;
  detections: string;
  detectionRate: string;
  activity: string;
  decisionBreakdown: string;
  decisionClean: string;
  decisionWarning: string;
  decisionCheating: string;
  decisionPending: string;
  recentActivity: string;
  viewAll: string;
  noActivity: string;
  quickActions: string;
  manageMembers: string;
  manageMembersDesc: string;
  viewAllScans: string;
  viewAllScansDesc: string;
  openSettings: string;
  openSettingsDesc: string;
  unattributed: string;
}> = {
  tr: {
    title: "Genel Bakış",
    subtitle: "Kurumsal çalışma alanının özeti.",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    members: "Üyeler",
    seatsUsed: "koltuk kullanıldı",
    totalScans: "Toplam tarama",
    detections: "Tespitler",
    detectionRate: "Tespit oranı",
    activity: "Tarama etkinliği",
    decisionBreakdown: "Karar dağılımı",
    decisionClean: "Temiz",
    decisionWarning: "Uyarı",
    decisionCheating: "Hile",
    decisionPending: "Çalışıyor",
    recentActivity: "Son etkinlik",
    viewAll: "Tümünü gör",
    noActivity: "Henüz tarama yok.",
    quickActions: "Hızlı işlemler",
    manageMembers: "Üyeleri yönet",
    manageMembersDesc: "Davet et ve rolleri ayarla",
    viewAllScans: "Tüm taramaları gör",
    viewAllScansDesc: "Her taramaya göz at",
    openSettings: "Ayarları aç",
    openSettingsDesc: "Çalışma alanı yapılandırması",
    unattributed: "Bilinmeyen",
  },
  en: {
    title: "Overview",
    subtitle: "A summary of your Enterprise workspace.",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    members: "Members",
    seatsUsed: "seats used",
    totalScans: "Total scans",
    detections: "Detections",
    detectionRate: "Detection rate",
    activity: "Scan activity",
    decisionBreakdown: "Decision breakdown",
    decisionClean: "Clean",
    decisionWarning: "Warning",
    decisionCheating: "Cheating",
    decisionPending: "Running",
    recentActivity: "Recent activity",
    viewAll: "View all",
    noActivity: "No scans yet.",
    quickActions: "Quick actions",
    manageMembers: "Manage members",
    manageMembersDesc: "Invite and set roles",
    viewAllScans: "View all scans",
    viewAllScansDesc: "Browse every scan",
    openSettings: "Open settings",
    openSettingsDesc: "Workspace configuration",
    unattributed: "Unknown",
  },
};

export default function TeamOverviewPage() {
  return (
    <EnterpriseGate>
      <OverviewContent />
    </EnterpriseGate>
  );
}

function OverviewContent() {
  const { session, server } = useServerContext();
  const { locale } = useLocale();
  const t = useT(STRINGS);
  const [overview, setOverview] = useState<ServerOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getServerOverview(session.apiKey, session.serverId)
      .then(setOverview)
      .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
  }, [session, t.apiUnreachable]);

  if (!session) return null;

  const seats = server?.enterpriseSeats ?? 0;
  const dateFmt = locale === "en" ? "en-US" : "tr-TR";

  const activityPoints = (overview?.activitySeries ?? []).map((p) => ({
    label: new Date(p.date).toLocaleDateString(dateFmt, { day: "numeric", month: "short" }),
    count: p.count,
  }));

  const decisionLabel: Record<Decision, string> = {
    Temiz: t.decisionClean,
    Uyarı: t.decisionWarning,
    Hile: t.decisionCheating,
    Çalışıyor: t.decisionPending,
  };
  const decisionBuckets = (overview?.decisionBuckets ?? []).map((b) => ({
    label: decisionLabel[b.decision as Decision] ?? b.decision,
    value: b.count,
    color: DECISION_COLORS[b.decision as Decision] ?? "#71717a",
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">{t.title}</h1>
      <p className="mt-1 text-sm text-zinc-400">{t.subtitle}</p>

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label={t.members}
          value={overview ? `${overview.memberCount} / ${seats || overview.memberCount}` : undefined}
          sub={t.seatsUsed}
        />
        <Tile label={t.totalScans} value={overview?.totalScans} />
        <Tile label={t.detections} value={overview?.detectionCount} tone="danger" />
        <Tile label={t.detectionRate} value={overview ? `${overview.detectionRatePercent.toFixed(1)}%` : undefined} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-200">{t.activity}</h2>
          <div className="mt-4">{overview && <ActivityChart points={activityPoints} />}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">{t.decisionBreakdown}</h2>
          <div className="mt-4">{overview && <DecisionDonut buckets={decisionBuckets} />}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">{t.recentActivity}</h2>
            <Link href="/team/scans" className="text-xs font-medium text-violet-400 hover:text-violet-300">
              {t.viewAll} →
            </Link>
          </div>

          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs text-zinc-500">
              <tr>
                <th className="pb-2 font-medium">PIN</th>
                <th className="pb-2 font-medium">{t.members}</th>
                <th className="pb-2 font-medium">{t.decisionBreakdown}</th>
                <th className="pb-2 text-right font-medium">{t.activity}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {overview?.recentActivity.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-zinc-500">
                    {t.noActivity}
                  </td>
                </tr>
              )}
              {overview?.recentActivity.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 font-mono text-xs text-zinc-500">{s.playerIdentifier.slice(0, 6).toUpperCase()}</td>
                  <td className="py-2 text-zinc-300">{s.createdByUsername ?? t.unattributed}</td>
                  <td className="py-2">
                    <span
                      className="text-xs font-medium uppercase"
                      style={{ color: DECISION_COLORS[s.decision as Decision] ?? "#a1a1aa" }}
                    >
                      {decisionLabel[s.decision as Decision] ?? s.decision}
                    </span>
                  </td>
                  <td className="py-2 text-right text-xs text-zinc-500">
                    {new Date(s.createdAt).toLocaleDateString(dateFmt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">{t.quickActions}</h2>
          <div className="mt-3 space-y-2">
            <QuickAction href="/team/members" title={t.manageMembers} desc={t.manageMembersDesc} />
            <QuickAction href="/team/scans" title={t.viewAllScans} desc={t.viewAllScansDesc} />
            <QuickAction href="/team/settings" title={t.openSettings} desc={t.openSettingsDesc} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value?: string | number;
  sub?: string;
  tone?: "default" | "danger" | "good";
}) {
  const valueColor = tone === "danger" ? "text-red-400" : tone === "good" ? "text-emerald-400" : "text-white";
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${valueColor}`}>{value ?? "—"}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-600">{sub}</div>}
    </div>
  );
}

function QuickAction({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2.5 transition-colors hover:border-violet-800/60"
    >
      <div>
        <div className="text-sm font-medium text-zinc-200">{title}</div>
        <div className="text-xs text-zinc-500">{desc}</div>
      </div>
      <span className="text-zinc-600">→</span>
    </Link>
  );
}
