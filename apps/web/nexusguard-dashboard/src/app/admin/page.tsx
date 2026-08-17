"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import {
  ApiError,
  adminAddMember,
  adminCancelPlan,
  adminDeleteMarketplaceListing,
  adminDeleteMarketplaceReview,
  adminRemoveMember,
  adminSetPlan,
  deleteAdminScan,
  getMarketplaceListing,
  listAdminScans,
  listAdminServerMembers,
  listAdminServers,
  listAdminUsers,
  listMarketplaceListings,
  setSiteAdmin,
  type AdminScanSummaryResponse,
  type AdminServerResponse,
  type AdminUserResponse,
  type MarketplaceListingSummaryResponse,
  type MarketplaceReviewResponse,
  type Plan,
  type ServerMemberResponse,
} from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import StatusBadge from "@/components/StatusBadge";
import { useLocale, type Locale } from "@/lib/i18n/LocaleContext";
import { useT, type Dict } from "@/lib/i18n/useT";

type Tab = "users" | "servers" | "scans" | "marketplace";

type T = (typeof STRINGS)["tr"];

const STRINGS: Dict<{
  adminOnlyTitle: string;
  adminOnlyBody: string;
  title: string;
  subtitle: string;
  tabServers: string;
  tabUsers: string;
  tabScans: string;
  tabMarketplace: string;
  apiUnreachable: string;
  search: string;
  loading: string;
  noResults: string;
  areYouSure: string;
  cancel: string;
  yesCancelPlan: string;
  yesDelete: string;
  individual: string;
  seatsSuffix: string;
  cancelPlanAction: string;
  editPlan: string;
  planLabel: string;
  seatCount: string;
  seatsOption: string;
  duration: string;
  save: string;
  saving: string;
  serverSearchPlaceholder: string;
  colServer: string;
  colOwner: string;
  colPlan: string;
  colMembers: string;
  colEnds: string;
  manageMembers: string;
  hideMembers: string;
  membersLoading: string;
  noMembers: string;
  addMemberPlaceholder: string;
  addMemberButton: string;
  adding: string;
  removeMemberButton: string;
  ownerLabel: string;
  managerLabel: string;
  memberLabel: string;
  userSearchPlaceholder: string;
  colUser: string;
  colEmail: string;
  colDiscordId: string;
  colGoogle: string;
  colRegistered: string;
  linked: string;
  you: string;
  removeAdmin: string;
  makeAdmin: string;
  marketplaceIntro: string;
  marketplaceSearchPlaceholder: string;
  colTitle: string;
  colAuthor: string;
  colInstalls: string;
  colRating: string;
  colReviews: string;
  colDate: string;
  comments: string;
  close: string;
  noCommentsYet: string;
  scansIntro: string;
  scanSearchPlaceholder: string;
  colPlayer: string;
  colServerName: string;
  colStartedBy: string;
  colStatus: string;
  colRisk: string;
  colDetections: string;
  detail: string;
  delete: string;
  statusAll: string;
  statusPending: string;
  statusInProgress: string;
  statusCompleted: string;
  statusExpired: string;
  statusFailed: string;
  statusCancelled: string;
  week1: string;
  week2: string;
  week3: string;
  month1: string;
  month3: string;
  month6: string;
  year1: string;
  indefinite: string;
}> = {
  tr: {
    adminOnlyTitle: "Bu sayfa sadece site yöneticisine özel",
    adminOnlyBody:
      "Yönetici Paneli'ne erişimin yok. Bu bir hataysa mevcut site yöneticisinden hesabına admin yetkisi vermesini iste.",
    title: "Yönetici Paneli",
    subtitle:
      "Tüm müşterileri ve sunucu planlarını buradan yönetiyorsun - satın alım Discord ticket'larından yapılıyor, ödeme onaylandıktan sonra planı burada tanımla.",
    tabServers: "Sunucular & Planlar",
    tabUsers: "Müşteriler",
    tabScans: "Tarama Yönetimi",
    tabMarketplace: "Mağaza",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    search: "Ara",
    loading: "Yükleniyor...",
    noResults: "Sonuç bulunamadı.",
    areYouSure: "Emin misin?",
    cancel: "Vazgeç",
    yesCancelPlan: "Evet, iptal et",
    yesDelete: "Evet, sil",
    individual: "Bireysel",
    seatsSuffix: "kişilik",
    cancelPlanAction: "İptal Et",
    editPlan: "Planı Düzenle",
    planLabel: "plan",
    seatCount: "Kişi sayısı",
    seatsOption: "kişilik",
    duration: "Süre",
    save: "Kaydet",
    saving: "Kaydediliyor...",
    serverSearchPlaceholder: "Sunucu adı ya da sahibinin kullanıcı adı ile ara",
    colServer: "Sunucu",
    colOwner: "Sahip",
    colPlan: "Plan",
    colMembers: "Üye",
    colEnds: "Bitiş",
    manageMembers: "Üyeler",
    hideMembers: "Üyeleri gizle",
    membersLoading: "Üyeler yükleniyor...",
    noMembers: "Henüz üye yok.",
    addMemberPlaceholder: "Discord kullanıcı adı, Discord ID ya da Google e-postası",
    addMemberButton: "Ekle",
    adding: "Ekleniyor...",
    removeMemberButton: "Kaldır",
    ownerLabel: "Sahip",
    managerLabel: "Yönetici",
    memberLabel: "Üye",
    userSearchPlaceholder: "Kullanıcı adı ya da e-posta ile ara",
    colUser: "Kullanıcı",
    colEmail: "E-posta",
    colDiscordId: "Discord ID",
    colGoogle: "Google",
    colRegistered: "Kayıt",
    linked: "Bağlı",
    you: "Sen",
    removeAdmin: "Admin'i Kaldır",
    makeAdmin: "Admin Yap",
    marketplaceIntro:
      "Tool Designer'da paylaşılan tüm mağaza tasarımları - onay mekanizması yok, yayınlanan tasarımlar hemen görünür oluyor. Uygunsuz bir tasarımı ya da yorumu buradan kaldır.",
    marketplaceSearchPlaceholder: "Başlık ya da yazarın kullanıcı adı ile ara",
    colTitle: "Başlık",
    colAuthor: "Yazar",
    colInstalls: "Kurulum",
    colRating: "Puan",
    colReviews: "Yorum",
    colDate: "Tarih",
    comments: "Yorumlar",
    close: "Kapat",
    noCommentsYet: "Bu tasarıma henüz yorum yapılmamış.",
    scansIntro: "Platformdaki tüm sunucularda, tüm kullanıcılar tarafından yapılmış her tarama - kendi sunucundan bağımsız.",
    scanSearchPlaceholder: "Oyuncu, sunucu ya da taramayı başlatan kullanıcı ile ara",
    colPlayer: "Oyuncu",
    colServerName: "Sunucu",
    colStartedBy: "Başlatan",
    colStatus: "Durum",
    colRisk: "Risk",
    colDetections: "Tespit",
    detail: "Detay",
    delete: "Sil",
    statusAll: "Tümü",
    statusPending: "Beklemede",
    statusInProgress: "Devam ediyor",
    statusCompleted: "Tamamlandı",
    statusExpired: "Süresi doldu",
    statusFailed: "Başarısız",
    statusCancelled: "İptal edildi",
    week1: "1 Hafta",
    week2: "2 Hafta",
    week3: "3 Hafta",
    month1: "1 Ay",
    month3: "3 Ay",
    month6: "6 Ay",
    year1: "1 Yıl",
    indefinite: "Süresiz",
  },
  en: {
    adminOnlyTitle: "This page is for site admins only",
    adminOnlyBody:
      "You don't have access to the Admin Panel. If this is a mistake, ask the current site admin to grant your account admin access.",
    title: "Admin Panel",
    subtitle:
      "Manage all customers and server plans from here - purchases go through Discord tickets, apply the plan here once payment is confirmed.",
    tabServers: "Servers & Plans",
    tabUsers: "Customers",
    tabScans: "Scan Management",
    tabMarketplace: "Marketplace",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    search: "Search",
    loading: "Loading...",
    noResults: "No results found.",
    areYouSure: "Are you sure?",
    cancel: "Cancel",
    yesCancelPlan: "Yes, cancel",
    yesDelete: "Yes, delete",
    individual: "Individual",
    seatsSuffix: "seats",
    cancelPlanAction: "Cancel Plan",
    editPlan: "Edit Plan",
    planLabel: "plan",
    seatCount: "Seat count",
    seatsOption: "seats",
    duration: "Duration",
    save: "Save",
    saving: "Saving...",
    serverSearchPlaceholder: "Search by server name or owner's username",
    colServer: "Server",
    colOwner: "Owner",
    colPlan: "Plan",
    colMembers: "Members",
    colEnds: "Ends",
    manageMembers: "Members",
    hideMembers: "Hide members",
    membersLoading: "Loading members...",
    noMembers: "No members yet.",
    addMemberPlaceholder: "Discord username, Discord ID, or Google email",
    addMemberButton: "Add",
    adding: "Adding...",
    removeMemberButton: "Remove",
    ownerLabel: "Owner",
    managerLabel: "Manager",
    memberLabel: "Member",
    userSearchPlaceholder: "Search by username or email",
    colUser: "User",
    colEmail: "Email",
    colDiscordId: "Discord ID",
    colGoogle: "Google",
    colRegistered: "Registered",
    linked: "Linked",
    you: "You",
    removeAdmin: "Remove Admin",
    makeAdmin: "Make Admin",
    marketplaceIntro:
      "All marketplace designs shared in Tool Designer - no approval gate, published designs go live immediately. Take down an inappropriate design or comment from here.",
    marketplaceSearchPlaceholder: "Search by title or author's username",
    colTitle: "Title",
    colAuthor: "Author",
    colInstalls: "Installs",
    colRating: "Rating",
    colReviews: "Reviews",
    colDate: "Date",
    comments: "Comments",
    close: "Close",
    noCommentsYet: "This design has no comments yet.",
    scansIntro: "Every scan run by every user across every server on the platform - independent of your own server.",
    scanSearchPlaceholder: "Search by player, server, or the user who started the scan",
    colPlayer: "Player",
    colServerName: "Server",
    colStartedBy: "Started by",
    colStatus: "Status",
    colRisk: "Risk",
    colDetections: "Detections",
    detail: "Details",
    delete: "Delete",
    statusAll: "All",
    statusPending: "Pending",
    statusInProgress: "In progress",
    statusCompleted: "Completed",
    statusExpired: "Expired",
    statusFailed: "Failed",
    statusCancelled: "Cancelled",
    week1: "1 Week",
    week2: "2 Weeks",
    week3: "3 Weeks",
    month1: "1 Month",
    month3: "3 Months",
    month6: "6 Months",
    year1: "1 Year",
    indefinite: "Indefinite",
  },
};

export default function AdminPage() {
  const router = useRouter();
  const { session, user, loading } = useServerContext();
  const { locale } = useLocale();
  const t = useT(STRINGS);
  const [tab, setTab] = useState<Tab>("servers");

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/setup");
  }, [session, loading, router]);

  if (loading || !session) return null;

  if (!user?.isSiteAdmin) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-red-900/60 bg-red-950/30 text-red-400">
          🔒
        </div>
        <h1 className="mt-4 text-xl font-semibold text-white">{t.adminOnlyTitle}</h1>
        <p className="mt-2 text-sm text-zinc-400">{t.adminOnlyBody}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">{t.title}</h1>
      <p className="mt-1 text-sm text-zinc-400">{t.subtitle}</p>

      <div className="mt-6 flex gap-1 border-b border-zinc-800">
        <TabButton active={tab === "servers"} onClick={() => setTab("servers")}>
          {t.tabServers}
        </TabButton>
        <TabButton active={tab === "users"} onClick={() => setTab("users")}>
          {t.tabUsers}
        </TabButton>
        <TabButton active={tab === "scans"} onClick={() => setTab("scans")}>
          {t.tabScans}
        </TabButton>
        <TabButton active={tab === "marketplace"} onClick={() => setTab("marketplace")}>
          {t.tabMarketplace}
        </TabButton>
      </div>

      {tab === "servers" && <ServersTab t={t} locale={locale} />}
      {tab === "users" && <UsersTab currentUserId={user.id} t={t} locale={locale} />}
      {tab === "scans" && <ScansTab t={t} locale={locale} />}
      {tab === "marketplace" && <MarketplaceTab t={t} locale={locale} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
        active ? "border-violet-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function durationPresets(t: T): { label: string; days: number | null }[] {
  return [
    { label: t.week1, days: 7 },
    { label: t.week2, days: 14 },
    { label: t.week3, days: 21 },
    { label: t.month1, days: 30 },
    { label: t.month3, days: 90 },
    { label: t.month6, days: 180 },
    { label: t.year1, days: 365 },
    { label: t.indefinite, days: null },
  ];
}

const PLAN_OPTIONS: Plan[] = ["Free", "Pro", "ProDuo", "Enterprise"];
const PLAN_DISPLAY_LABEL: Record<Plan, string> = {
  Free: "Free",
  Pro: "Pro",
  ProDuo: "Professional",
  Enterprise: "Enterprise",
};
const MIN_ENTERPRISE_SEATS = 5;

function ServersTab({ t, locale }: { t: T; locale: Locale }) {
  const [query, setQuery] = useState("");
  const [servers, setServers] = useState<AdminServerResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [membersOpenId, setMembersOpenId] = useState<string | null>(null);

  const load = useCallback(
    (q?: string) => {
      listAdminServers(q)
        .then(setServers)
        .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
    },
    [t.apiUnreachable]
  );

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(query);
  }

  return (
    <div className="mt-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.serverSearchPlaceholder}
          className="w-full max-w-sm rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
        />
        <button type="submit" className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
          {t.search}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">{t.colServer}</th>
              <th className="px-4 py-2 font-medium">{t.colOwner}</th>
              <th className="px-4 py-2 font-medium">{t.colPlan}</th>
              <th className="px-4 py-2 font-medium">{t.colMembers}</th>
              <th className="px-4 py-2 font-medium">{t.colEnds}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {servers === null && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  {t.loading}
                </td>
              </tr>
            )}
            {servers?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  {t.noResults}
                </td>
              </tr>
            )}
            {servers?.map((s) => (
              <ServerRow
                key={s.id}
                server={s}
                editing={editingId === s.id}
                onEdit={() => setEditingId(s.id)}
                onCancel={() => setEditingId(null)}
                onSaved={(updated) => {
                  setServers((prev) => prev?.map((x) => (x.id === updated.id ? updated : x)) ?? null);
                  setEditingId(null);
                }}
                membersOpen={membersOpenId === s.id}
                onToggleMembers={() => setMembersOpenId((prev) => (prev === s.id ? null : s.id))}
                onMemberCountChanged={(delta) => {
                  setServers((prev) =>
                    prev?.map((x) => (x.id === s.id ? { ...x, memberCount: x.memberCount + delta } : x)) ?? null
                  );
                }}
                t={t}
                locale={locale}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ServerRow({
  server,
  editing,
  onEdit,
  onCancel,
  onSaved,
  membersOpen,
  onToggleMembers,
  onMemberCountChanged,
  t,
  locale,
}: {
  server: AdminServerResponse;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaved: (s: AdminServerResponse) => void;
  membersOpen: boolean;
  onToggleMembers: () => void;
  onMemberCountChanged: (delta: number) => void;
  t: T;
  locale: Locale;
}) {
  const [plan, setPlan] = useState<Plan>(server.plan);
  const [seats, setSeats] = useState<number>(server.enterpriseSeats ?? 10);
  const [durationDays, setDurationDays] = useState<number | null>(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await adminSetPlan(server.id, plan, plan === "Enterprise" ? seats : null, plan === "Free" ? null : durationDays);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      const updated = await adminCancelPlan(server.id);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
    } finally {
      setCancelling(false);
      setConfirmingCancel(false);
    }
  }

  const row = !editing ? (
      <tr>
        <td className="px-4 py-2.5 font-medium text-zinc-200">
          {server.plan === "Enterprise" ? (
            server.name
          ) : (
            <span className="text-zinc-400">{t.individual}</span>
          )}
        </td>
        <td className="px-4 py-2.5 text-zinc-400">{server.ownerUsername}</td>
        <td className="px-4 py-2.5 text-zinc-300">
          {PLAN_DISPLAY_LABEL[server.plan]}
          {server.enterpriseSeats && <span className="text-zinc-500"> · {server.enterpriseSeats} {t.seatsSuffix}</span>}
        </td>
        <td className="px-4 py-2.5 text-zinc-400">{server.memberCount}</td>
        <td className="px-4 py-2.5 text-zinc-500">
          {server.planExpiresAt ? new Date(server.planExpiresAt).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR") : "—"}
        </td>
        <td className="px-4 py-2.5 text-right">
          {confirmingCancel ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-xs text-zinc-500">{t.areYouSure}</span>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="rounded-md border border-red-800 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40 disabled:opacity-50"
              >
                {cancelling ? "..." : t.yesCancelPlan}
              </button>
              <button
                onClick={() => setConfirmingCancel(false)}
                className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-600"
              >
                {t.cancel}
              </button>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              {server.plan === "Enterprise" && (
                <button
                  onClick={onToggleMembers}
                  className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                    membersOpen ? "border-violet-700 text-violet-300" : "border-zinc-700 text-zinc-300 hover:border-violet-700 hover:text-violet-300"
                  }`}
                >
                  {membersOpen ? t.hideMembers : t.manageMembers}
                </button>
              )}
              {server.plan !== "Free" && (
                <button
                  onClick={() => setConfirmingCancel(true)}
                  className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-red-800 hover:text-red-400"
                >
                  {t.cancelPlanAction}
                </button>
              )}
              <button
                onClick={onEdit}
                className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-violet-700 hover:text-violet-300"
              >
                {t.editPlan}
              </button>
            </span>
          )}
          {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
        </td>
      </tr>
  ) : (
    <tr>
      <td colSpan={6} className="bg-zinc-900/60 px-4 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <div className="text-xs text-zinc-500">{server.name} — {t.planLabel}</div>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as Plan)}
              className="mt-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-violet-600"
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PLAN_DISPLAY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>

          {plan === "Enterprise" && (
            <div>
              <div className="text-xs text-zinc-500">{t.seatCount}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="number"
                  min={MIN_ENTERPRISE_SEATS}
                  value={seats}
                  onChange={(e) => setSeats(Math.max(MIN_ENTERPRISE_SEATS, Number(e.target.value)))}
                  className="w-20 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-violet-600"
                />
                <span className="text-xs text-zinc-500">{t.seatsOption}</span>
              </div>
            </div>
          )}

          {plan !== "Free" && (
            <div>
              <div className="text-xs text-zinc-500">{t.duration}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {durationPresets(t).map((d) => (
                  <button
                    key={d.label}
                    onClick={() => setDurationDays(d.days)}
                    className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                      durationDays === d.days
                        ? "border-violet-600 bg-violet-950/40 text-violet-300"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="ml-auto flex gap-2">
            <button
              onClick={onCancel}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-600"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {saving ? t.saving : t.save}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </td>
    </tr>
  );

  return (
    <>
      {row}
      {membersOpen && server.plan === "Enterprise" && (
        <tr>
          <td colSpan={6} className="border-t border-zinc-800 bg-zinc-950/60 px-4 py-4">
            <AdminMembersPanel server={server} t={t} locale={locale} onMemberCountChanged={onMemberCountChanged} />
          </td>
        </tr>
      )}
    </>
  );
}

function AdminMembersPanel({
  server,
  t,
  locale,
  onMemberCountChanged,
}: {
  server: AdminServerResponse;
  t: T;
  locale: Locale;
  onMemberCountChanged: (delta: number) => void;
}) {
  const [members, setMembers] = useState<ServerMemberResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    listAdminServerMembers(server.id)
      .then(setMembers)
      .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
  }, [server.id, t.apiUnreachable]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await adminAddMember(server.id, identifier.trim());
      setIdentifier("");
      load();
      onMemberCountChanged(1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(memberId: string) {
    try {
      await adminRemoveMember(server.id, memberId);
      load();
      onMemberCountChanged(-1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
    }
  }

  const roleLabel = (role: string) => (role === "Owner" ? t.ownerLabel : role === "Manager" ? t.managerLabel : t.memberLabel);
  const dateFmt = locale === "en" ? "en-US" : "tr-TR";

  return (
    <div>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={t.addMemberPlaceholder}
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm outline-none focus:border-violet-600"
        />
        <button
          type="submit"
          disabled={adding}
          className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {adding ? t.adding : t.addMemberButton}
        </button>
      </form>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-3 space-y-1">
        {members === null && <p className="text-xs text-zinc-500">{t.membersLoading}</p>}
        {members?.length === 0 && <p className="text-xs text-zinc-500">{t.noMembers}</p>}
        {members?.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-200">{m.username}</span>
              <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">{roleLabel(m.role)}</span>
              <span className="text-xs text-zinc-600">{new Date(m.addedAt).toLocaleDateString(dateFmt)}</span>
            </div>
            {m.role !== "Owner" && (
              <button
                onClick={() => handleRemove(m.id)}
                className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:border-red-800 hover:text-red-400"
              >
                {t.removeMemberButton}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersTab({ currentUserId, t, locale }: { currentUserId: string; t: T; locale: Locale }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (q?: string) => {
      listAdminUsers(q)
        .then(setUsers)
        .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
    },
    [t.apiUnreachable]
  );

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(query);
  }

  async function toggleAdmin(u: AdminUserResponse) {
    setError(null);
    try {
      const updated = await setSiteAdmin(u.username, !u.isSiteAdmin);
      setUsers((prev) => prev?.map((x) => (x.id === updated.id ? updated : x)) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.userSearchPlaceholder}
          className="w-full max-w-sm rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
        />
        <button type="submit" className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
          {t.search}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">{t.colUser}</th>
              <th className="px-4 py-2 font-medium">{t.colEmail}</th>
              <th className="px-4 py-2 font-medium">{t.colDiscordId}</th>
              <th className="px-4 py-2 font-medium">{t.colGoogle}</th>
              <th className="px-4 py-2 font-medium">{t.colRegistered}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users === null && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  {t.loading}
                </td>
              </tr>
            )}
            {users?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  {t.noResults}
                </td>
              </tr>
            )}
            {users?.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2.5 font-medium text-zinc-200">
                  {u.username}
                  {u.isSiteAdmin && (
                    <span className="ml-2 rounded border border-amber-800/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                      ADMIN
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-zinc-400">{u.email ?? "—"}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{u.discordId ?? "—"}</td>
                <td className="px-4 py-2.5 text-zinc-500">{u.googleLinked ? t.linked : "—"}</td>
                <td className="px-4 py-2.5 text-zinc-500">
                  {new Date(u.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR")}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {u.id === currentUserId ? (
                    <span className="text-xs text-zinc-600">{t.you}</span>
                  ) : (
                    <button
                      onClick={() => toggleAdmin(u)}
                      className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                        u.isSiteAdmin
                          ? "border-zinc-700 text-zinc-400 hover:border-red-800 hover:text-red-400"
                          : "border-zinc-700 text-zinc-300 hover:border-amber-700 hover:text-amber-400"
                      }`}
                    >
                      {u.isSiteAdmin ? t.removeAdmin : t.makeAdmin}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Reactive moderation, not pre-publish approval - listings/reviews go live immediately (see
// MarketplaceController), so this is the only way to take down something inappropriate after
// the fact. Reviews are only fetched (getMarketplaceListing) when a row is expanded, to avoid
// N+1 requests for a tab that's mostly just browsed for listing titles/authors.
function MarketplaceTab({ t, locale }: { t: T; locale: Locale }) {
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<MarketplaceListingSummaryResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<MarketplaceReviewResponse[] | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [confirmingDeleteReviewId, setConfirmingDeleteReviewId] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  const load = useCallback(
    (q?: string) => {
      listMarketplaceListings(q)
        .then(setListings)
        .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
    },
    [t.apiUnreachable]
  );

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(query);
  }

  async function handleDeleteListing(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await adminDeleteMarketplaceListing(id);
      setListings((prev) => prev?.filter((l) => l.id !== id) ?? null);
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setReviews(null);
    setReviewsError(null);
    try {
      const detail = await getMarketplaceListing(id);
      setReviews(detail.reviews);
    } catch (err) {
      setReviewsError(err instanceof ApiError ? err.message : t.apiUnreachable);
    }
  }

  async function handleDeleteReview(id: string) {
    setDeletingReviewId(id);
    setReviewsError(null);
    try {
      await adminDeleteMarketplaceReview(id);
      setReviews((prev) => prev?.filter((r) => r.id !== id) ?? null);
      setListings((prev) =>
        prev?.map((l) => (l.id === expandedId ? { ...l, reviewCount: l.reviewCount - 1 } : l)) ?? null
      );
    } catch (err) {
      setReviewsError(err instanceof ApiError ? err.message : t.apiUnreachable);
    } finally {
      setDeletingReviewId(null);
      setConfirmingDeleteReviewId(null);
    }
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-zinc-400">{t.marketplaceIntro}</p>

      <form onSubmit={handleSearch} className="mt-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.marketplaceSearchPlaceholder}
          className="w-full max-w-sm rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
        />
        <button type="submit" className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
          {t.search}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">{t.colTitle}</th>
              <th className="px-4 py-2 font-medium">{t.colAuthor}</th>
              <th className="px-4 py-2 font-medium">{t.colInstalls}</th>
              <th className="px-4 py-2 font-medium">{t.colRating}</th>
              <th className="px-4 py-2 font-medium">{t.colReviews}</th>
              <th className="px-4 py-2 font-medium">{t.colDate}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {listings === null && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  {t.loading}
                </td>
              </tr>
            )}
            {listings?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  {t.noResults}
                </td>
              </tr>
            )}
            {listings?.map((l) => (
              <Fragment key={l.id}>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-zinc-200">{l.title}</td>
                  <td className="px-4 py-2.5 text-zinc-400">{l.authorUsername}</td>
                  <td className="px-4 py-2.5 text-zinc-400">{l.installCount}</td>
                  <td className="px-4 py-2.5 text-zinc-300">{l.reviewCount === 0 ? "—" : l.averageRating.toFixed(1)}</td>
                  <td className="px-4 py-2.5 text-zinc-400">{l.reviewCount}</td>
                  <td className="px-4 py-2.5 text-zinc-500">
                    {new Date(l.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {confirmingDeleteId === l.id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-xs text-zinc-500">{t.areYouSure}</span>
                        <button
                          onClick={() => handleDeleteListing(l.id)}
                          disabled={deletingId === l.id}
                          className="rounded-md border border-red-800 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                        >
                          {deletingId === l.id ? "..." : t.yesDelete}
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(null)}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-600"
                        >
                          {t.cancel}
                        </button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => toggleExpand(l.id)}
                          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-violet-700 hover:text-violet-300"
                        >
                          {expandedId === l.id ? t.close : t.comments}
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(l.id)}
                          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-red-800 hover:text-red-400"
                        >
                          {t.delete}
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
                {expandedId === l.id && (
                  <tr>
                    <td colSpan={7} className="bg-zinc-900/60 px-4 py-3">
                      {reviewsError && <p className="text-xs text-red-400">{reviewsError}</p>}
                      {reviews === null && !reviewsError && (
                        <p className="text-xs text-zinc-500">{t.loading}</p>
                      )}
                      {reviews?.length === 0 && (
                        <p className="text-xs text-zinc-500">{t.noCommentsYet}</p>
                      )}
                      {reviews && reviews.length > 0 && (
                        <div className="space-y-1.5">
                          {reviews.map((r) => (
                            <div key={r.id} className="flex items-start justify-between gap-3 rounded-md border border-zinc-800 px-3 py-2">
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-zinc-300">
                                  {r.reviewerUsername} <span className="text-zinc-500">· {r.rating}/5</span>
                                </div>
                                {r.comment && <p className="mt-0.5 truncate text-xs text-zinc-500">{r.comment}</p>}
                              </div>
                              {confirmingDeleteReviewId === r.id ? (
                                <span className="flex shrink-0 items-center gap-1.5">
                                  <button
                                    onClick={() => handleDeleteReview(r.id)}
                                    disabled={deletingReviewId === r.id}
                                    className="rounded-md border border-red-800 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                                  >
                                    {deletingReviewId === r.id ? "..." : t.yesDelete}
                                  </button>
                                  <button
                                    onClick={() => setConfirmingDeleteReviewId(null)}
                                    className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-600"
                                  >
                                    {t.cancel}
                                  </button>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setConfirmingDeleteReviewId(r.id)}
                                  className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-red-800 hover:text-red-400"
                                >
                                  {t.delete}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function scanStatusOptions(t: T): { label: string; value: string }[] {
  return [
    { label: t.statusAll, value: "" },
    { label: t.statusPending, value: "Pending" },
    { label: t.statusInProgress, value: "InProgress" },
    { label: t.statusCompleted, value: "Completed" },
    { label: t.statusExpired, value: "Expired" },
    { label: t.statusFailed, value: "Failed" },
    { label: t.statusCancelled, value: "Cancelled" },
  ];
}

// Cross-server - every scan any server has ever run, not just one team's own (see the
// [id] detail page and AdminController.ListScans/DeleteScan). Distinct from /scans, which
// only ever shows the currently-selected server's own scans to that server's own admins.
function ScansTab({ t, locale }: { t: T; locale: Locale }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [scans, setScans] = useState<AdminScanSummaryResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(
    (q?: string, s?: string) => {
      listAdminScans(q, s)
        .then(setScans)
        .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
    },
    [t.apiUnreachable]
  );

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(query, status);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await deleteAdminScan(id);
      setScans((prev) => prev?.filter((s) => s.id !== id) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-zinc-400">{t.scansIntro}</p>

      <form onSubmit={handleSearch} className="mt-4 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.scanSearchPlaceholder}
          className="w-full max-w-sm rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-200 outline-none focus:border-violet-600"
        >
          {scanStatusOptions(t).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
          {t.search}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">{t.colPlayer}</th>
              <th className="px-4 py-2 font-medium">{t.colServerName}</th>
              <th className="px-4 py-2 font-medium">{t.colStartedBy}</th>
              <th className="px-4 py-2 font-medium">{t.colStatus}</th>
              <th className="px-4 py-2 font-medium">{t.colRisk}</th>
              <th className="px-4 py-2 font-medium">{t.colDetections}</th>
              <th className="px-4 py-2 font-medium">{t.colDate}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {scans === null && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-zinc-500">
                  {t.loading}
                </td>
              </tr>
            )}
            {scans?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-zinc-500">
                  {t.noResults}
                </td>
              </tr>
            )}
            {scans?.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2.5 font-medium text-zinc-200">{s.playerIdentifier}</td>
                <td className="px-4 py-2.5 text-zinc-400">{s.serverName}</td>
                <td className="px-4 py-2.5 text-zinc-400">{s.createdByUsername ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={s.status as never} />
                </td>
                <td className="px-4 py-2.5 text-zinc-300">{s.riskScore ?? "—"}</td>
                <td className="px-4 py-2.5 text-zinc-400">{s.detectionCount}</td>
                <td className="px-4 py-2.5 text-zinc-500">
                  {new Date(s.createdAt).toLocaleString(locale === "en" ? "en-US" : "tr-TR")}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {confirmingDeleteId === s.id ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-xs text-zinc-500">{t.areYouSure}</span>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="rounded-md border border-red-800 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                      >
                        {deletingId === s.id ? "..." : t.yesDelete}
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-600"
                      >
                        {t.cancel}
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Link
                        href={`/admin/scans/${s.id}`}
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-violet-700 hover:text-violet-300"
                      >
                        {t.detail}
                      </Link>
                      <button
                        onClick={() => setConfirmingDeleteId(s.id)}
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-red-800 hover:text-red-400"
                      >
                        {t.delete}
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
