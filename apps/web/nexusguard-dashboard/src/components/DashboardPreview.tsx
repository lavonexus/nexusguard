"use client";

import Logo from "@/components/Logo";
import { useT, type Dict } from "@/lib/i18n/useT";

const STRINGS: Dict<{
  overview: string;
  scanHistory: string;
  leaderboard: string;
  enterprise: string;
  greeting: string;
  subtitle: string;
  newScan: string;
  totalScans: string;
  detections: string;
  cleanScans: string;
  detectionRate: string;
  activity: string;
}> = {
  tr: {
    overview: "Genel Bakış",
    scanHistory: "Tarama Geçmişi",
    leaderboard: "Lider Tablosu",
    enterprise: "Kurumsal",
    greeting: "İyi akşamlar.",
    subtitle: "İşte tespit özetin.",
    newScan: "+ Yeni tarama",
    totalScans: "Toplam tarama",
    detections: "Tespitler",
    cleanScans: "Temiz taramalar",
    detectionRate: "Tespit oranı",
    activity: "Tarama etkinliği",
  },
  en: {
    overview: "Overview",
    scanHistory: "Scan History",
    leaderboard: "Leaderboard",
    enterprise: "Enterprise",
    greeting: "Good evening.",
    subtitle: "Here's your detection summary.",
    newScan: "+ New scan",
    totalScans: "Total scans",
    detections: "Detections",
    cleanScans: "Clean scans",
    detectionRate: "Detection rate",
    activity: "Scan activity",
  },
};

// A static, non-interactive recreation of the real /overview page for the marketing hero -
// same sidebar labels, same tile names, same chart shapes as the actual dashboard, just with
// illustrative numbers instead of a live fetch. Nothing here is a usage claim.
export default function DashboardPreview() {
  const t = useT(STRINGS);

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-violet-950/40">
      <div className="flex">
        <div className="hidden w-40 shrink-0 border-r border-zinc-800 bg-zinc-950 p-3 sm:block">
          <div className="flex items-center gap-1.5 px-1 py-1">
            <Logo className="h-4 w-4" />
            <span className="text-xs font-semibold text-white">NexusGuard</span>
          </div>
          <div className="mt-4 space-y-1 text-[11px]">
            <div className="rounded bg-zinc-900 px-2 py-1.5 font-medium text-white">{t.overview}</div>
            <div className="px-2 py-1.5 text-zinc-500">{t.scanHistory}</div>
            <div className="px-2 py-1.5 text-zinc-500">{t.leaderboard}</div>
            <div className="px-2 py-1.5 text-zinc-500">{t.enterprise}</div>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white sm:text-sm">{t.greeting}</div>
              <div className="text-[10px] text-zinc-500 sm:text-xs">{t.subtitle}</div>
            </div>
            <div className="rounded-md bg-violet-600 px-2.5 py-1 text-[10px] font-medium text-white sm:text-xs">{t.newScan}</div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            <PreviewTile label={t.totalScans} value="12" />
            <PreviewTile label={t.detections} value="3" tone="danger" />
            <PreviewTile label={t.cleanScans} value="7" tone="good" />
            <PreviewTile label={t.detectionRate} value="25%" />
          </div>

          <div className="mt-3 grid grid-cols-[1.4fr_1fr] gap-2">
            <div className="rounded-lg border border-zinc-800 p-2.5">
              <div className="text-[10px] font-medium text-zinc-400">{t.activity}</div>
              <svg viewBox="0 0 200 60" className="mt-1.5 w-full" style={{ height: 50 }}>
                <polyline
                  points="0,45 20,40 40,42 60,20 80,30 100,15 120,25 140,10 160,22 180,8 200,18"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div className="flex items-center justify-center rounded-lg border border-zinc-800 p-2.5">
              <svg viewBox="0 0 40 40" width="44" height="44">
                <circle cx="20" cy="20" r="15" fill="none" stroke="#27272a" strokeWidth="8" />
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  fill="none"
                  stroke="#0ca30c"
                  strokeWidth="8"
                  strokeDasharray="55 100"
                  transform="rotate(-90 20 20)"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="15"
                  fill="none"
                  stroke="#d03b3b"
                  strokeWidth="8"
                  strokeDasharray="24 100"
                  strokeDashoffset="-55"
                  transform="rotate(-90 20 20)"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewTile({ label, value, tone }: { label: string; value: string; tone?: "good" | "danger" }) {
  return (
    <div className="rounded-lg border border-zinc-800 p-2">
      <div className="truncate text-[9px] text-zinc-500 sm:text-[10px]">{label}</div>
      <div
        className={`mt-0.5 text-xs font-semibold sm:text-sm ${
          tone === "danger" ? "text-red-400" : tone === "good" ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
