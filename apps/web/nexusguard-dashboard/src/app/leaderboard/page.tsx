"use client";

import { useEffect, useState } from "react";
import { ApiError, getLeaderboard, type LeaderboardEntryResponse } from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import { useRouter } from "next/navigation";

const AVATAR_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899", "#84cc16"];

function colorFor(username: string) {
  let hash = 0;
  for (const ch of username) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { session, loading } = useServerContext();
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [entries, setEntries] = useState<LeaderboardEntryResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/setup");
      return;
    }
    setEntries(null);
    getLeaderboard(period)
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı."));
  }, [session, loading, router, period]);

  if (loading || !session) return null;

  const [first, second, third] = entries ?? [];
  const rest = (entries ?? []).slice(3);

  return (
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold text-white">
        <span className="text-violet-400">◆</span>
        Tarama <span className="text-violet-400">Sıralaması</span>
      </h1>
      <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        NexusGuard genelinde en çok tarama yapan kim?
      </p>

      <div className="mt-4 inline-flex items-center gap-1 rounded-full border border-zinc-800 p-1 text-xs">
        {(["weekly", "monthly"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
              period === p ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {p === "weekly" ? "Haftalık" : "Aylık"}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {entries === null && !error && <p className="mt-10 text-sm text-zinc-500">Yükleniyor...</p>}

      {entries !== null && entries.length === 0 && (
        <div className="mt-10 rounded-lg border border-zinc-800 px-6 py-10 text-sm text-zinc-500">
          <p>
            {period === "weekly" ? "Son 7 günde" : "Son 30 günde"} kimliği bilinen bir tarama
            yapılmamış.
          </p>
          <p className="mt-2 text-xs text-zinc-600">
            Bir taramanın burada sayılması için, taramayı oluşturan kişinin Discord ya da Google
            ile giriş yapmış olması gerekiyor.
          </p>
        </div>
      )}

      {entries !== null && entries.length > 0 && (
        <>
          <div className="mt-10 grid grid-cols-3 items-end gap-3 text-left">
            <PodiumCard entry={second} rank={2} />
            <PodiumCard entry={first} rank={1} tall />
            <PodiumCard entry={third} rank={3} />
          </div>

          {rest.length > 0 && (
            <div className="mt-8 space-y-2 text-left">
              {rest.map((e, i) => (
                <div
                  key={e.userId}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600/20 text-xs font-semibold text-violet-300">
                      {i + 4}
                    </span>
                    <Avatar entry={e} size={32} />
                    <span className="text-sm font-medium text-zinc-200">{e.username}</span>
                    <ProviderBadge provider={e.provider} />
                  </div>
                  <div className="flex items-center gap-2">
                    <StatChip label="Tarama" value={e.scanCount} />
                    <StatChip label="Tespit" value={e.detectionCount} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Avatar({ entry, size }: { entry: LeaderboardEntryResponse; size: number }) {
  if (entry.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- avatar hosts are external
    // (Discord/Google CDNs), a fixed set next/image's remotePatterns isn't configured for.
    return (
      <img
        src={entry.avatarUrl}
        alt={entry.username}
        width={size}
        height={size}
        className="shrink-0 rounded-md object-cover"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white"
      style={{ backgroundColor: colorFor(entry.username), width: size, height: size }}
    >
      {entry.username.charAt(0).toUpperCase()}
    </span>
  );
}

function ProviderBadge({ provider }: { provider: LeaderboardEntryResponse["provider"] }) {
  if (!provider) return null;
  const isDiscord = provider === "Discord";
  return (
    <span
      title={provider}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${
        isDiscord ? "bg-[#5865F2]" : "bg-white text-black"
      }`}
    >
      {isDiscord ? "D" : "G"}
    </span>
  );
}

function PodiumCard({ entry, rank, tall }: { entry?: LeaderboardEntryResponse; rank: number; tall?: boolean }) {
  if (!entry) return <div />;

  return (
    <div
      className={`relative rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-center ${
        tall ? "pb-6" : "pb-4"
      }`}
    >
      <span
        className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white ${
          rank === 1 ? "bg-violet-600" : "bg-zinc-700"
        }`}
      >
        {rank}. SIRA
      </span>
      <div className="mx-auto mt-3 flex justify-center">
        <Avatar entry={entry} size={56} />
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5 truncate text-sm font-semibold text-white">
        {rank}. {entry.username}
        <ProviderBadge provider={entry.provider} />
      </div>
      <div className="mx-auto mt-3 space-y-1.5">
        <StatChip label="Tarama" value={entry.scanCount} full />
        <StatChip label="Tespit" value={entry.detectionCount} full />
      </div>
    </div>
  );
}

function StatChip({ label, value, full }: { label: string; value: number; full?: boolean }) {
  return (
    <div
      className={`rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 ${
        full ? "flex items-center justify-between" : ""
      }`}
    >
      {label}: <span className="font-semibold text-zinc-200">{value}</span>
    </div>
  );
}
