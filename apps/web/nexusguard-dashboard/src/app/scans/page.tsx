"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, createScan, listScans, type ScanSessionResponse } from "@/lib/api";
import { loadSession, type ServerSession } from "@/lib/session";
import { DECISION_COLORS, DECISION_TEXT_CLASS, decisionOf, type Decision } from "@/lib/riskBuckets";

const POLL_INTERVAL_MS = 4000;
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50] as const;

type FilterPill = "Tümü" | Decision;
const FILTER_PILLS: FilterPill[] = ["Tümü", "Hile", "Uyarı", "Temiz", "Çalışıyor"];

interface ActiveScan {
  scanId: string;
  pin: string;
  expiresAt: string;
}

function activeScanStorageKey(serverId: string) {
  return `nexusguard.activeScan.${serverId}`;
}

export default function ScansPage() {
  const router = useRouter();
  const [session, setSession] = useState<ServerSession | null>(null);
  const [scans, setScans] = useState<ScanSessionResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [activeScan, setActiveScan] = useState<ActiveScan | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterPill>("Tümü");
  const [rowsPerPage, setRowsPerPage] = useState<(typeof ROWS_PER_PAGE_OPTIONS)[number]>(10);
  const [page, setPage] = useState(1);
  const [copiedField, setCopiedField] = useState<"pin" | "link" | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/setup");
      return;
    }
    setSession(s);

    const stored = sessionStorage.getItem(activeScanStorageKey(s.serverId));
    if (stored) {
      try {
        setActiveScan(JSON.parse(stored));
      } catch {
        // ignore malformed storage
      }
    }
  }, [router]);

  const refresh = useCallback(async (apiKey: string) => {
    try {
      const data = await listScans(apiKey);
      setScans(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı.");
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    refresh(session.apiKey);
    const interval = setInterval(() => refresh(session.apiKey), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [session, refresh]);

  // The PIN in the sidebar is only meaningful while its scan is still Pending - once it's
  // been exchanged for a token (or expired), the PIN itself is spent, so drop it.
  useEffect(() => {
    if (!activeScan || !scans || !session) return;
    const match = scans.find((s) => s.id === activeScan.scanId);
    if (match && match.status !== "Pending") {
      setActiveScan(null);
      sessionStorage.removeItem(activeScanStorageKey(session.serverId));
    }
  }, [scans, activeScan, session]);

  async function handleNewScan() {
    if (!session) return;
    setCreating(true);
    setError(null);
    try {
      const scan = await createScan(session.apiKey);
      const next: ActiveScan = { scanId: scan.scanId, pin: scan.pin, expiresAt: scan.pinExpiresAt };
      setActiveScan(next);
      sessionStorage.setItem(activeScanStorageKey(session.serverId), JSON.stringify(next));
      refresh(session.apiKey);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy(field: "pin" | "link", text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  const counts = useMemo(() => {
    const c: Record<FilterPill, number> = { Tümü: 0, Hile: 0, Uyarı: 0, Temiz: 0, Çalışıyor: 0 };
    for (const s of scans ?? []) {
      c.Tümü++;
      c[decisionOf(s)]++;
    }
    return c;
  }, [scans]);

  const visibleScans = useMemo(() => {
    if (!scans) return null;
    let list = scans;
    if (filter !== "Tümü") list = list.filter((s) => decisionOf(s) === filter);
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      list = list.filter((s) => s.playerIdentifier.toLowerCase().includes(needle));
    }
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [scans, filter, search]);

  const totalPages = visibleScans ? Math.max(1, Math.ceil(visibleScans.length / rowsPerPage)) : 1;
  const pageSafe = Math.min(page, totalPages);
  const pagedScans = visibleScans?.slice((pageSafe - 1) * rowsPerPage, pageSafe * rowsPerPage) ?? null;

  const quickStats = useMemo(() => {
    if (!scans) return null;

    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const thisWeek = scans.filter((s) => now - new Date(s.createdAt).getTime() < week).length;
    const lastWeek = scans.filter((s) => {
      const age = now - new Date(s.createdAt).getTime();
      return age >= week && age < 2 * week;
    }).length;
    const weekDelta = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

    const cheatCount = scans.filter((s) => decisionOf(s) === "Hile").length;
    const detectionRate = scans.length > 0 ? (cheatCount / scans.length) * 100 : 0;

    const durations = scans
      .filter((s) => s.startedAt && s.completedAt)
      .map((s) => new Date(s.completedAt!).getTime() - new Date(s.startedAt!).getTime())
      .filter((ms) => ms > 0);
    const avgDurationMs = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

    const byNewest = [...scans].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    let cleanStreak = 0;
    for (const s of byNewest) {
      if (s.status !== "Completed") continue;
      if (decisionOf(s) === "Temiz") cleanStreak++;
      else break;
    }

    return { thisWeek, weekDelta, detectionRate, avgDurationMs, cleanStreak };
  }, [scans]);

  const downloadLink =
    activeScan && typeof window !== "undefined"
      ? `${window.location.origin}/api/download-scanner?pin=${activeScan.pin}`
      : "";

  if (!session) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Tarama geçmişi</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {counts.Tümü} tarama · başlattığın her adli inceleme
          </p>
        </div>
        <button
          onClick={handleNewScan}
          disabled={creating}
          className="rounded-md bg-violet-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? "Oluşturuluyor..." : "+ Yeni tarama"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {FILTER_PILLS.map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setPage(1);
                  }}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === f
                      ? "border-zinc-600 bg-zinc-800 text-white"
                      : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {f !== "Tümü" && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: DECISION_COLORS[f] }}
                    />
                  )}
                  {f} {counts[f]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value) as (typeof ROWS_PER_PAGE_OPTIONS)[number]);
                  setPage(1);
                }}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-violet-600"
              >
                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} satır
                  </option>
                ))}
              </select>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="İsim ara..."
                className="w-40 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs outline-none focus:border-violet-600"
              />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-[11px] uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">PIN</th>
                  <th className="px-4 py-2 font-medium">Hedef</th>
                  <th className="px-4 py-2 font-medium">Karar</th>
                  <th className="px-4 py-2 font-medium">Bulgular</th>
                  <th className="px-4 py-2 font-medium">Zaman</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {pagedScans === null && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                      Yükleniyor...
                    </td>
                  </tr>
                )}
                {pagedScans !== null && pagedScans.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                      {scans && scans.length > 0
                        ? "Filtrelere uyan tarama yok."
                        : "Henüz tarama yok. Yeni tarama başlatarak bir PIN oluştur."}
                    </td>
                  </tr>
                )}
                {pagedScans?.map((scan) => {
                  const decision = decisionOf(scan);
                  const isActivePin = activeScan?.scanId === scan.id;
                  const barPct =
                    decision === "Çalışıyor" ? 18 : Math.max(6, Math.min(100, scan.riskScore ?? 0));

                  return (
                    <tr
                      key={scan.id}
                      onClick={() => router.push(`/scans/${scan.id}`)}
                      className="cursor-pointer transition-colors hover:bg-zinc-900/60"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">
                        {isActivePin ? activeScan!.pin : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-xs font-semibold text-violet-300">
                            {scan.playerIdentifier.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-zinc-200">{scan.playerIdentifier}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${DECISION_TEXT_CLASS[decision]}`}>
                        {decision}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${barPct}%`, backgroundColor: DECISION_COLORS[decision] }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500">
                        {new Date(scan.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-600">›</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {visibleScans && visibleScans.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
              <span>
                Gösterilen: {(pageSafe - 1) * rowsPerPage + 1}–
                {Math.min(pageSafe * rowsPerPage, visibleScans.length)} / {visibleScans.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageSafe === 1}
                  className="rounded-md border border-zinc-800 px-2.5 py-1 text-zinc-300 hover:border-zinc-700 disabled:opacity-40"
                >
                  ‹ Önceki
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`h-7 w-7 rounded-md text-center ${
                      n === pageSafe ? "bg-violet-600 text-white" : "border border-zinc-800 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageSafe === totalPages}
                  className="rounded-md border border-zinc-800 px-2.5 py-1 text-zinc-300 hover:border-zinc-700 disabled:opacity-40"
                >
                  Sonraki ›
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900/40 to-transparent">
            <div className="flex items-center justify-between px-4 pt-4">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <span className="text-sm">🔑</span> PIN Kodun
              </span>
              {activeScan && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Aktif
                </span>
              )}
            </div>

            {!activeScan ? (
              <div className="mx-4 mb-4 mt-3 rounded-lg border border-dashed border-zinc-800 px-3 py-6 text-center">
                <p className="text-xs text-zinc-500">Şu an bekleyen bir tarama yok.</p>
                <button
                  onClick={handleNewScan}
                  disabled={creating}
                  className="mt-3 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-60"
                >
                  {creating ? "Oluşturuluyor..." : "Yeni tarama"}
                </button>
              </div>
            ) : (
              <div className="px-4 pb-4">
                <div className="mt-3 flex justify-center gap-1.5">
                  {activeScan.pin.split("").map((ch, i) => (
                    <div
                      key={i}
                      className="flex h-10 w-8 items-center justify-center rounded-lg border border-violet-800/60 bg-violet-950/20 font-mono text-base font-semibold text-white shadow-[0_0_12px_-4px_rgba(139,92,246,0.5)]"
                    >
                      {ch}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleCopy("pin", activeScan.pin)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-500"
                >
                  <span aria-hidden>⧉</span>
                  {copiedField === "pin" ? "Kopyalandı" : "PIN'i kopyala"}
                </button>

                <div className="mt-4 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  <span>İndirme bağlantısı</span>
                  <button
                    onClick={() => handleCopy("link", downloadLink)}
                    className="flex items-center gap-1 text-violet-400 transition-colors hover:text-violet-300"
                  >
                    <span aria-hidden>↗</span>
                    {copiedField === "link" ? "Kopyalandı" : "Paylaş"}
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 py-1.5 pl-2.5 pr-1.5">
                  <span
                    title={downloadLink}
                    className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-300"
                  >
                    {downloadLink}
                  </span>
                  <button
                    onClick={() => handleCopy("link", downloadLink)}
                    title="Bağlantıyı kopyala"
                    className="flex shrink-0 items-center justify-center rounded-md border border-zinc-700 px-2 py-1.5 text-xs text-zinc-300 transition-colors hover:border-violet-700 hover:text-violet-300"
                  >
                    <span aria-hidden>⧉</span>
                  </button>
                </div>

                <button
                  onClick={() => router.push(`/scans/${activeScan.scanId}`)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-900/60"
                >
                  Sonuçları izle
                  <span aria-hidden>→</span>
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900/40 to-transparent p-4">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
              <span className="text-sm">📊</span> Hızlı istatistikler
            </span>
            <div className="mt-3 space-y-1">
              <QuickStat
                icon="📅"
                label="Bu haftaki taramalar"
                sub="geçen haftaya göre"
                value={quickStats?.thisWeek}
                delta={quickStats?.weekDelta ?? undefined}
              />
              <QuickStat
                icon="🎯"
                label="Tespit oranı"
                sub={`${counts.Tümü} taramada ${counts.Hile} işaretli`}
                value={quickStats ? `${quickStats.detectionRate.toFixed(1)}%` : undefined}
                valueClassName={quickStats && quickStats.detectionRate > 0 ? "text-red-400" : undefined}
              />
              <QuickStat
                icon="⏱"
                label="Ort. tarama süresi"
                sub="tamamlanan taramalar"
                value={quickStats?.avgDurationMs != null ? formatDuration(quickStats.avgDurationMs) : "—"}
              />
              <QuickStat
                icon="✨"
                label="Temiz serisi"
                sub="üst üste temiz"
                value={quickStats?.cleanStreak}
                valueClassName="text-emerald-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStat({
  icon,
  label,
  sub,
  value,
  delta,
  valueClassName,
}: {
  icon: string;
  label: string;
  sub: string;
  value?: string | number;
  delta?: number;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-1.5 py-2 transition-colors hover:bg-zinc-900/40">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-xs">{icon}</span>
        <div>
          <div className="text-xs text-zinc-300">{label}</div>
          <div className="text-[11px] text-zinc-600">{sub}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`text-sm font-semibold ${valueClassName ?? "text-white"}`}>{value ?? "—"}</span>
        {typeof delta === "number" && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
              delta >= 0
                ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30"
                : "bg-red-500/10 text-red-400 ring-red-500/30"
            }`}
          >
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}

function formatDuration(ms: number) {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s}s`;
}
