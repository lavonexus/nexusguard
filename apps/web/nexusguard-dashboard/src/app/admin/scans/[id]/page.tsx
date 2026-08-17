"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, getAdminScan, type AdminScanDetailResponse } from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import ScanDetailView from "@/components/ScanDetailView";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useT, type Dict } from "@/lib/i18n/useT";

const STRINGS: Dict<{
  adminOnly: string;
  backToAdmin: string;
  loading: string;
  apiUnreachable: string;
  serverLabel: string;
  createdLabel: string;
}> = {
  tr: {
    adminOnly: "Bu sayfa sadece site yöneticisine özel",
    backToAdmin: "← Yönetici Paneli'ne dön",
    loading: "Yükleniyor...",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    serverLabel: "Sunucu",
    createdLabel: "Oluşturuldu",
  },
  en: {
    adminOnly: "This page is for site admins only",
    backToAdmin: "← Back to Admin Panel",
    loading: "Loading...",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    serverLabel: "Server",
    createdLabel: "Created",
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
          {/* Cross-server context the customer-facing view doesn't need, since a customer is
              already scoped to their own server - kept as a thin strip above the shared view. */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>{t.serverLabel}: <span className="text-zinc-300">{detail.scan.serverName}</span></span>
            <span>{t.createdLabel}: <span className="text-zinc-300">{new Date(detail.scan.createdAt).toLocaleString(locale === "en" ? "en-US" : "tr-TR")}</span></span>
          </div>

          <ScanDetailView detail={{ session: detail.scan, results: detail.results, detections: detail.detections }} pin={null} />
        </>
      )}
    </div>
  );
}
