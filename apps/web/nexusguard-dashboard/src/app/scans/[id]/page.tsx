"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError, getScan, type ScanSessionDetailResponse } from "@/lib/api";
import { loadSession, type ServerSession } from "@/lib/session";
import ScanDetailView from "@/components/ScanDetailView";
import { useT, type Dict } from "@/lib/i18n/useT";

const POLL_INTERVAL_MS = 3000;
const ACTIVE_STATUSES = new Set(["Pending", "TokenIssued", "InProgress"]);

const STRINGS: Dict<{ backToScans: string; loading: string; apiUnreachable: string }> = {
  tr: { backToScans: "← Taramalara dön", loading: "Yükleniyor...", apiUnreachable: "NexusGuard API'ye ulaşılamadı." },
  en: { backToScans: "← Back to scans", loading: "Loading...", apiUnreachable: "Couldn't reach the NexusGuard API." },
};

export default function ScanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT(STRINGS);
  const [session, setSession] = useState<ServerSession | null>(null);
  const [detail, setDetail] = useState<ScanSessionDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);

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

      {detail && <ScanDetailView detail={detail} pin={pin} />}
    </div>
  );
}
