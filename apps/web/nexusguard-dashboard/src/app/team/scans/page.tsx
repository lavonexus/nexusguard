"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, listScans, type ScanSessionResponse } from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import { DECISION_COLORS, DECISION_TEXT_CLASS, decisionOf, type Decision } from "@/lib/riskBuckets";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useT, type Dict } from "@/lib/i18n/useT";
import EnterpriseGate from "@/components/EnterpriseGate";

const POLL_INTERVAL_MS = 4000;

type FilterPill = "Tümü" | Decision;
const FILTER_PILLS: FilterPill[] = ["Tümü", "Hile", "Uyarı", "Temiz", "Çalışıyor"];

const DECISION_LABEL: Dict<Record<FilterPill, string>> = {
  tr: { Tümü: "Tümü", Hile: "Hile", Uyarı: "Uyarı", Temiz: "Temiz", Çalışıyor: "Çalışıyor" },
  en: { Tümü: "All", Hile: "Cheating", Uyarı: "Warning", Temiz: "Clean", Çalışıyor: "Running" },
};

const STRINGS: Dict<{
  title: string;
  subtitle: string;
  apiUnreachable: string;
  searchPlaceholder: string;
  target: string;
  scannedBy: string;
  decision: string;
  time: string;
  loading: string;
  noMatches: string;
  unattributed: string;
}> = {
  tr: {
    title: "Taramalar",
    subtitle:
      "Erişimin olan taramalar - sahip ve yöneticiler her taramayı görür, üyeler varsayılan olarak yalnızca kendi başlattıklarını görür.",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    searchPlaceholder: "Oyuncu ara...",
    target: "Oyuncu",
    scannedBy: "Tarayan",
    decision: "Karar",
    time: "Zaman",
    loading: "Yükleniyor...",
    noMatches: "Eşleşen tarama yok.",
    unattributed: "Bilinmeyen",
  },
  en: {
    title: "Scans",
    subtitle:
      "Scans you have access to - the owner and managers see every scan, members see only their own by default.",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    searchPlaceholder: "Search player...",
    target: "Player",
    scannedBy: "Scanned by",
    decision: "Decision",
    time: "Time",
    loading: "Loading...",
    noMatches: "No matching scans.",
    unattributed: "Unknown",
  },
};

export default function TeamScansPage() {
  return (
    <EnterpriseGate>
      <ScansContent />
    </EnterpriseGate>
  );
}

function ScansContent() {
  const router = useRouter();
  const { session } = useServerContext();
  const { locale } = useLocale();
  const t = useT(STRINGS);
  const decisionLabel = useT(DECISION_LABEL);
  const [scans, setScans] = useState<ScanSessionResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterPill>("Tümü");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    function poll() {
      listScans(session!.apiKey)
        .then((data) => {
          if (!cancelled) setScans(data);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof ApiError ? err.message : t.apiUnreachable);
        });
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session, t.apiUnreachable]);

  const counts = useMemo(() => {
    const c: Record<FilterPill, number> = { Tümü: scans?.length ?? 0, Hile: 0, Uyarı: 0, Temiz: 0, Çalışıyor: 0 };
    scans?.forEach((s) => c[decisionOf(s)]++);
    return c;
  }, [scans]);

  const filtered = useMemo(() => {
    return (scans ?? [])
      .filter((s) => filter === "Tümü" || decisionOf(s) === filter)
      .filter((s) => s.playerIdentifier.toLowerCase().includes(search.trim().toLowerCase()));
  }, [scans, filter, search]);

  if (!session) return null;

  const dateFmt = locale === "en" ? "en-US" : "tr-TR";

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">{t.title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-400">{t.subtitle}</p>

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {FILTER_PILLS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? "border-violet-600 bg-violet-600/10 text-white" : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            {f !== "Tümü" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: DECISION_COLORS[f] }} />}
            {decisionLabel[f]}
            <span className="text-zinc-600">{counts[f]}</span>
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t.searchPlaceholder}
        className="mt-3 w-full max-w-sm rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
      />

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">{t.target}</th>
              <th className="px-4 py-2 font-medium">{t.scannedBy}</th>
              <th className="px-4 py-2 font-medium">{t.decision}</th>
              <th className="px-4 py-2 text-right font-medium">{t.time}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {scans === null && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                  {t.loading}
                </td>
              </tr>
            )}
            {scans !== null && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                  {t.noMatches}
                </td>
              </tr>
            )}
            {filtered.map((s) => {
              const decision = decisionOf(s);
              return (
                <tr
                  key={s.id}
                  onClick={() => router.push(`/scans/${s.id}`)}
                  className="cursor-pointer hover:bg-zinc-900/60"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-xs font-semibold text-violet-300">
                        {s.playerIdentifier.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-zinc-200">{s.playerIdentifier}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">{s.createdByUsername ?? t.unattributed}</td>
                  <td className={`px-4 py-2.5 text-xs font-medium uppercase ${DECISION_TEXT_CLASS[decision]}`}>
                    {decisionLabel[decision]}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-500">
                    {new Date(s.createdAt).toLocaleDateString(dateFmt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
