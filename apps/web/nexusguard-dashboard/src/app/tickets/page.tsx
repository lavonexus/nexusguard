"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  DISCORD_LOGIN_URL,
  getTicket,
  listMyTickets,
  type SupportTicketDetailResponse,
  type SupportTicketMessageResponse,
  type SupportTicketSummaryResponse,
} from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import { useLocale, type Locale } from "@/lib/i18n/LocaleContext";
import { useT, type Dict } from "@/lib/i18n/useT";

const POLL_INTERVAL_MS = 4000;

const CATEGORY_LABEL: Dict<Record<string, string>> = {
  tr: { "Teknik Destek": "Teknik Destek", "Satın Alım": "Satın Alım", Partnerlik: "Partnerlik" },
  en: { "Teknik Destek": "Technical Support", "Satın Alım": "Purchase", Partnerlik: "Partnership" },
};

const STRINGS: Dict<{
  title: string;
  subtitle: string;
  apiUnreachable: string;
  loading: string;
  noTicketsYet: string;
  noTicketsHint: string;
  needsDiscordTitle: string;
  needsDiscordBody: string;
  loginWithDiscord: string;
  open: string;
  closed: string;
  messagesCount: string;
  selectTicket: string;
  readOnlyBanner: string;
  staffBadge: string;
  closedBy: string;
  closedOn: string;
}> = {
  tr: {
    title: "Biletlerim",
    subtitle: "toplam · destek biletlerini görüntüle ve dökümlerini oku.",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    loading: "Yükleniyor...",
    noTicketsYet: "Henüz bir destek bileti açmadın.",
    noTicketsHint: "Discord sunucumuzdan bir bilet açtığında burada görünecek.",
    needsDiscordTitle: "Biletlerini görmek için Discord bağla",
    needsDiscordBody:
      "Destek biletlerin Discord hesabınla eşleştirilir - onları burada görebilmen için hesabına Discord ile giriş yapman gerekiyor.",
    loginWithDiscord: "Discord ile giriş yap",
    open: "Aktif",
    closed: "Kapalı",
    messagesCount: "mesaj",
    selectTicket: "Görüntülemek için soldan bir bilet seç.",
    readOnlyBanner: "Salt okunur — yanıtlar Discord üzerinden",
    staffBadge: "YETKİLİ",
    closedBy: "Kapatan",
    closedOn: "Kapanma",
  },
  en: {
    title: "My Tickets",
    subtitle: "total · view your support tickets and read their transcripts.",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    loading: "Loading...",
    noTicketsYet: "You haven't opened a support ticket yet.",
    noTicketsHint: "Once you open one on our Discord server, it'll show up here.",
    needsDiscordTitle: "Link Discord to see your tickets",
    needsDiscordBody:
      "Your support tickets are matched to your Discord account - you need to sign in to your account with Discord to see them here.",
    loginWithDiscord: "Sign in with Discord",
    open: "Active",
    closed: "Closed",
    messagesCount: "messages",
    selectTicket: "Select a ticket on the left to view it.",
    readOnlyBanner: "Read-only — replies happen on Discord",
    staffBadge: "STAFF",
    closedBy: "Closed by",
    closedOn: "Closed on",
  },
};

export default function TicketsPage() {
  const router = useRouter();
  const { session, user, loading: userLoading } = useServerContext();
  const { locale } = useLocale();
  const t = useT(STRINGS);
  const categoryLabel = useT(CATEGORY_LABEL);

  const [tickets, setTickets] = useState<SupportTicketSummaryResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupportTicketDetailResponse | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading) return;
    if (!session) {
      router.replace("/setup");
    }
  }, [session, userLoading, router]);

  useEffect(() => {
    if (!session || !user?.discordLinked) return;
    listMyTickets()
      .then((list) => {
        setTickets(list);
        setSelectedId((prev) => prev ?? list[0]?.id ?? null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
  }, [session, user?.discordLinked, t.apiUnreachable]);

  // A ref (not the `detail` state) backs the polling gate below - the interval closure is
  // created once per selectedId and would otherwise only ever see the `detail` value from the
  // moment the effect ran, never a later update, which would either poll forever after a
  // ticket closes or never notice one is still open.
  const statusRef = useRef<"Open" | "Closed" | null>(null);

  useEffect(() => {
    statusRef.current = null;
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;

    function load() {
      getTicket(selectedId!)
        .then((d) => {
          if (cancelled) return;
          setDetail(d);
          setDetailError(null);
          statusRef.current = d.summary.status;
        })
        .catch((err) => {
          if (!cancelled) setDetailError(err instanceof ApiError ? err.message : t.apiUnreachable);
        });
    }

    load();
    const interval = setInterval(() => {
      if (statusRef.current === "Open") load();
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (userLoading || !session) return null;

  if (!user?.discordLinked) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-violet-800/60 bg-violet-950/30 text-violet-300">
          🎫
        </div>
        <h1 className="mt-4 text-xl font-semibold text-white">{t.needsDiscordTitle}</h1>
        <p className="mt-2 text-sm text-zinc-400">{t.needsDiscordBody}</p>
        <a
          href={DISCORD_LOGIN_URL}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#5865F2] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4752c4]"
        >
          {t.loginWithDiscord}
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{t.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {tickets?.length ?? 0} {t.subtitle}
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400">
          <LockIcon className="h-3.5 w-3.5" />
          {t.readOnlyBanner}
        </span>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          {tickets === null && <p className="px-4 py-6 text-center text-sm text-zinc-500">{t.loading}</p>}
          {tickets !== null && tickets.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-zinc-400">{t.noTicketsYet}</p>
              <p className="mt-1 text-xs text-zinc-600">{t.noTicketsHint}</p>
            </div>
          )}
          {tickets !== null && tickets.length > 0 && (
            <div className="divide-y divide-zinc-800">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedId(ticket.id)}
                  className={`block w-full px-4 py-3 text-left transition-colors ${
                    selectedId === ticket.id ? "bg-violet-500/10" : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <TicketStatusPill status={ticket.status} t={t} />
                    <span className="text-[10px] uppercase tracking-wide text-zinc-600">
                      # {categoryLabel[ticket.category] ?? ticket.category}
                    </span>
                  </div>
                  <div className="mt-1.5 truncate text-sm font-medium text-zinc-100">#{ticket.ticketNumber}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">{relativeTime(ticket.openedAt, locale)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-h-[360px] overflow-hidden rounded-xl border border-zinc-800">
          {!selectedId && (
            <div className="flex h-full min-h-[360px] items-center justify-center px-4 text-center text-sm text-zinc-500">
              {t.selectTicket}
            </div>
          )}

          {selectedId && detailError && <p className="p-4 text-sm text-red-400">{detailError}</p>}

          {selectedId && !detailError && !detail && (
            <p className="p-6 text-center text-sm text-zinc-500">{t.loading}</p>
          )}

          {detail && (
            <>
              <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-100">
                    #{detail.summary.ticketNumber} · {categoryLabel[detail.summary.category] ?? detail.summary.category}
                  </div>
                  {detail.summary.status === "Closed" && detail.summary.closedAt && (
                    <div className="mt-0.5 text-[11px] text-zinc-600">
                      {t.closedOn}: {new Date(detail.summary.closedAt).toLocaleString(locale === "en" ? "en-US" : "tr-TR")}
                    </div>
                  )}
                </div>
                <TicketStatusPill status={detail.summary.status} t={t} />
              </div>

              <div className="max-h-[520px] space-y-4 overflow-y-auto px-4 py-4">
                {detail.messages.map((m) => (
                  <MessageRow key={m.id} message={m} t={t} locale={locale} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketStatusPill({ status, t }: { status: "Open" | "Closed"; t: (typeof STRINGS)["tr"] }) {
  const isOpen = status === "Open";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${
        isOpen
          ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30"
          : "bg-zinc-500/10 text-zinc-400 ring-zinc-500/30"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-emerald-500" : "bg-zinc-500"}`} />
      {isOpen ? t.open : t.closed}
    </span>
  );
}

function MessageRow({
  message,
  t,
  locale,
}: {
  message: SupportTicketMessageResponse;
  t: (typeof STRINGS)["tr"];
  locale: Locale;
}) {
  return (
    <div className="flex items-start gap-3">
      {message.authorAvatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={message.authorAvatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
      ) : (
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            message.isStaff ? "bg-violet-600/20 text-violet-300" : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {message.authorUsername.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${message.isStaff ? "text-violet-300" : "text-zinc-200"}`}>
            {message.authorUsername}
          </span>
          {message.isStaff && (
            <span className="rounded border border-violet-800/60 bg-violet-950/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-300">
              {t.staffBadge}
            </span>
          )}
          <span className="text-[11px] text-zinc-600">
            {new Date(message.createdAt).toLocaleString(locale === "en" ? "en-US" : "tr-TR")}
          </span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300">
          {message.content}
        </p>
      </div>
    </div>
  );
}

function relativeTime(iso: string, locale: Locale) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return locale === "en" ? "just now" : "az önce";
  if (diffH < 24) return locale === "en" ? `${diffH}h ago` : `${diffH}s önce`;
  const diffD = Math.floor(diffH / 24);
  return locale === "en" ? `${diffD}d ago` : `${diffD}g önce`;
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
