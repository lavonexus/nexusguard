"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, getAdminScan, type AdminScanDetailResponse, type DetectionResponse } from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import StatusBadge from "@/components/StatusBadge";
import { useLocale, type Locale } from "@/lib/i18n/LocaleContext";
import { useT, type Dict } from "@/lib/i18n/useT";

type T = (typeof STRINGS)["tr"];

const STRINGS: Dict<{
  adminOnly: string;
  backToAdmin: string;
  loading: string;
  apiUnreachable: string;
  colServer: string;
  colStartedBy: string;
  colRiskScore: string;
  colCreated: string;
  detectionsTitle: string;
  noRulesMatched: string;
  colCategory: string;
  colDescription: string;
  colStatus: string;
  colConfidence: string;
  colWeight: string;
  publisherLabel: string;
  signedLabel: string;
  unsignedLabel: string;
  rawResultsTitle: string;
  noResultsYet: string;
  empty: string;
}> = {
  tr: {
    adminOnly: "Bu sayfa sadece site yöneticisine özel",
    backToAdmin: "← Yönetici Paneli'ne dön",
    loading: "Yükleniyor...",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    colServer: "Sunucu",
    colStartedBy: "Başlatan",
    colRiskScore: "Risk skoru",
    colCreated: "Oluşturuldu",
    detectionsTitle: "Tespitler",
    noRulesMatched: "Hiçbir kural eşleşmedi.",
    colCategory: "Kategori",
    colDescription: "Açıklama",
    colStatus: "Durum",
    colConfidence: "Güven",
    colWeight: "Ağırlık",
    publisherLabel: "Yayıncı",
    signedLabel: "İmzalı",
    unsignedLabel: "İmzasız",
    rawResultsTitle: "Ham sonuçlar",
    noResultsYet: "Henüz sonuç gönderilmedi.",
    empty: "Boş.",
  },
  en: {
    adminOnly: "This page is for site admins only",
    backToAdmin: "← Back to Admin Panel",
    loading: "Loading...",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    colServer: "Server",
    colStartedBy: "Started by",
    colRiskScore: "Risk score",
    colCreated: "Created",
    detectionsTitle: "Detections",
    noRulesMatched: "No rules matched.",
    colCategory: "Category",
    colDescription: "Description",
    colStatus: "Status",
    colConfidence: "Confidence",
    colWeight: "Weight",
    publisherLabel: "Publisher",
    signedLabel: "Signed",
    unsignedLabel: "Unsigned",
    rawResultsTitle: "Raw results",
    noResultsYet: "No results submitted yet.",
    empty: "Empty.",
  },
};

export default function AdminScanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session, user, loading } = useServerContext();
  const { locale } = useLocale();
  const t = useT(STRINGS);
  const [detail, setDetail] = useState<AdminScanDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/setup");
      return;
    }
    if (!user?.isSiteAdmin) return;

    getAdminScan(params.id)
      .then(setDetail)
      .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
  }, [session, user, loading, router, params.id, t.apiUnreachable]);

  if (loading || !session) return null;

  if (!user?.isSiteAdmin) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-red-900/60 bg-red-950/30 text-red-400">
          🔒
        </div>
        <h1 className="mt-4 text-xl font-semibold text-white">{t.adminOnly}</h1>
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin" className="text-sm text-zinc-400 hover:text-zinc-200">
        {t.backToAdmin}
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
            <h1 className="text-xl font-semibold text-white">{detail.scan.playerIdentifier}</h1>
            <StatusBadge status={detail.scan.status as never} />
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-zinc-800 p-4 sm:grid-cols-4">
            <Field label={t.colServer} value={detail.scan.serverName} />
            <Field label={t.colStartedBy} value={detail.scan.createdByUsername ?? "—"} />
            <Field label={t.colRiskScore} value={detail.scan.riskScore?.toString() ?? "—"} />
            <Field label={t.colCreated} value={formatDate(detail.scan.createdAt, locale)} />
          </dl>

          <h2 className="mt-8 text-sm font-semibold text-zinc-300">{t.detectionsTitle} ({detail.detections.length})</h2>

          {detail.detections.length === 0 ? (
            <p className="mt-3 rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
              {t.noRulesMatched}
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-zinc-900 text-zinc-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">{t.colCategory}</th>
                    <th className="px-4 py-2 font-medium">{t.colDescription}</th>
                    <th className="px-4 py-2 font-medium">{t.colStatus}</th>
                    <th className="px-4 py-2 font-medium">{t.colConfidence}</th>
                    <th className="px-4 py-2 font-medium">{t.colWeight}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {detail.detections.map((d: DetectionResponse) => (
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

          <h2 className="mt-8 text-sm font-semibold text-zinc-300">{t.rawResultsTitle} ({detail.results.length})</h2>

          {detail.results.length === 0 ? (
            <p className="mt-3 rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
              {t.noResultsYet}
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {detail.results.map((result) => {
                const items = parseItems(result.dataJson);
                return (
                  <details key={result.id} className="overflow-hidden rounded-lg border border-zinc-800">
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
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
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

function DetectionConfidenceBadge({ confidence, locale }: { confidence: string; locale: Locale }) {
  const style = CONFIDENCE_STYLES[confidence] ?? CONFIDENCE_STYLES.Low;
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${style}`}>
      {CONFIDENCE_LABELS[locale][confidence] ?? confidence}
    </span>
  );
}
