"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import {
  ApiError,
  adminCancelPlan,
  adminDeleteMarketplaceListing,
  adminDeleteMarketplaceReview,
  adminSetPlan,
  deleteAdminScan,
  getMarketplaceListing,
  listAdminScans,
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
} from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import StatusBadge from "@/components/StatusBadge";

type Tab = "users" | "servers" | "scans" | "marketplace";

export default function AdminPage() {
  const router = useRouter();
  const { session, user, loading } = useServerContext();
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
        <h1 className="mt-4 text-xl font-semibold text-white">Bu sayfa sadece site yöneticisine özel</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Yönetici Paneli&apos;ne erişimin yok. Bu bir hataysa mevcut site yöneticisinden hesabına
          admin yetkisi vermesini iste.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">Yönetici Paneli</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Tüm müşterileri ve sunucu planlarını buradan yönetiyorsun - satın alım Discord
        ticket&apos;larından yapılıyor, ödeme onaylandıktan sonra planı burada tanımla.
      </p>

      <div className="mt-6 flex gap-1 border-b border-zinc-800">
        <TabButton active={tab === "servers"} onClick={() => setTab("servers")}>
          Sunucular &amp; Planlar
        </TabButton>
        <TabButton active={tab === "users"} onClick={() => setTab("users")}>
          Müşteriler
        </TabButton>
        <TabButton active={tab === "scans"} onClick={() => setTab("scans")}>
          Tarama Yönetimi
        </TabButton>
        <TabButton active={tab === "marketplace"} onClick={() => setTab("marketplace")}>
          Mağaza
        </TabButton>
      </div>

      {tab === "servers" && <ServersTab />}
      {tab === "users" && <UsersTab currentUserId={user.id} />}
      {tab === "scans" && <ScansTab />}
      {tab === "marketplace" && <MarketplaceTab />}
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

const DURATION_PRESETS: { label: string; days: number | null }[] = [
  { label: "1 Hafta", days: 7 },
  { label: "2 Hafta", days: 14 },
  { label: "3 Hafta", days: 21 },
  { label: "1 Ay", days: 30 },
  { label: "3 Ay", days: 90 },
  { label: "6 Ay", days: 180 },
  { label: "1 Yıl", days: 365 },
  { label: "Süresiz", days: null },
];

const PLAN_OPTIONS: Plan[] = ["Free", "Pro", "ProDuo", "Enterprise"];
const SEAT_OPTIONS = [5, 10, 15];

function ServersTab() {
  const [query, setQuery] = useState("");
  const [servers, setServers] = useState<AdminServerResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback((q?: string) => {
    listAdminServers(q)
      .then(setServers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı."));
  }, []);

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
          placeholder="Sunucu adı ya da sahibinin kullanıcı adı ile ara"
          className="w-full max-w-sm rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
        />
        <button type="submit" className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
          Ara
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">Sunucu</th>
              <th className="px-4 py-2 font-medium">Sahip</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Üye</th>
              <th className="px-4 py-2 font-medium">Bitiş</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {servers === null && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  Yükleniyor...
                </td>
              </tr>
            )}
            {servers?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  Sonuç bulunamadı.
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
}: {
  server: AdminServerResponse;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaved: (s: AdminServerResponse) => void;
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
      setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı.");
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
      setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı.");
    } finally {
      setCancelling(false);
      setConfirmingCancel(false);
    }
  }

  if (!editing) {
    return (
      <tr>
        <td className="px-4 py-2.5 font-medium text-zinc-200">
          {server.plan === "Enterprise" ? (
            server.name
          ) : (
            <span className="text-zinc-400">Bireysel</span>
          )}
        </td>
        <td className="px-4 py-2.5 text-zinc-400">{server.ownerUsername}</td>
        <td className="px-4 py-2.5 text-zinc-300">
          {server.plan}
          {server.enterpriseSeats && <span className="text-zinc-500"> · {server.enterpriseSeats} kişilik</span>}
        </td>
        <td className="px-4 py-2.5 text-zinc-400">{server.memberCount}</td>
        <td className="px-4 py-2.5 text-zinc-500">
          {server.planExpiresAt ? new Date(server.planExpiresAt).toLocaleDateString("tr-TR") : "—"}
        </td>
        <td className="px-4 py-2.5 text-right">
          {confirmingCancel ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-xs text-zinc-500">Emin misin?</span>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="rounded-md border border-red-800 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40 disabled:opacity-50"
              >
                {cancelling ? "..." : "Evet, iptal et"}
              </button>
              <button
                onClick={() => setConfirmingCancel(false)}
                className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-600"
              >
                Vazgeç
              </button>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              {server.plan !== "Free" && (
                <button
                  onClick={() => setConfirmingCancel(true)}
                  className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-red-800 hover:text-red-400"
                >
                  İptal Et
                </button>
              )}
              <button
                onClick={onEdit}
                className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-violet-700 hover:text-violet-300"
              >
                Planı Düzenle
              </button>
            </span>
          )}
          {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={6} className="bg-zinc-900/60 px-4 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <div className="text-xs text-zinc-500">{server.name} — plan</div>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as Plan)}
              className="mt-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-violet-600"
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {plan === "Enterprise" && (
            <div>
              <div className="text-xs text-zinc-500">Kişi sayısı</div>
              <select
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                className="mt-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-violet-600"
              >
                {SEAT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s} kişilik
                  </option>
                ))}
              </select>
            </div>
          )}

          {plan !== "Free" && (
            <div>
              <div className="text-xs text-zinc-500">Süre</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {DURATION_PRESETS.map((d) => (
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
              Vazgeç
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </td>
    </tr>
  );
}

function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((q?: string) => {
    listAdminUsers(q)
      .then(setUsers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı."));
  }, []);

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
      setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı.");
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kullanıcı adı ya da e-posta ile ara"
          className="w-full max-w-sm rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
        />
        <button type="submit" className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
          Ara
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">Kullanıcı</th>
              <th className="px-4 py-2 font-medium">E-posta</th>
              <th className="px-4 py-2 font-medium">Discord ID</th>
              <th className="px-4 py-2 font-medium">Google</th>
              <th className="px-4 py-2 font-medium">Kayıt</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users === null && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  Yükleniyor...
                </td>
              </tr>
            )}
            {users?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  Sonuç bulunamadı.
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
                <td className="px-4 py-2.5 text-zinc-500">{u.googleLinked ? "Bağlı" : "—"}</td>
                <td className="px-4 py-2.5 text-zinc-500">{new Date(u.createdAt).toLocaleDateString("tr-TR")}</td>
                <td className="px-4 py-2.5 text-right">
                  {u.id === currentUserId ? (
                    <span className="text-xs text-zinc-600">Sen</span>
                  ) : (
                    <button
                      onClick={() => toggleAdmin(u)}
                      className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                        u.isSiteAdmin
                          ? "border-zinc-700 text-zinc-400 hover:border-red-800 hover:text-red-400"
                          : "border-zinc-700 text-zinc-300 hover:border-amber-700 hover:text-amber-400"
                      }`}
                    >
                      {u.isSiteAdmin ? "Admin'i Kaldır" : "Admin Yap"}
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
function MarketplaceTab() {
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

  const load = useCallback((q?: string) => {
    listMarketplaceListings(q)
      .then(setListings)
      .catch((err) => setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı."));
  }, []);

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
      setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı.");
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
      setReviewsError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı.");
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
      setReviewsError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı.");
    } finally {
      setDeletingReviewId(null);
      setConfirmingDeleteReviewId(null);
    }
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-zinc-400">
        Tool Designer&apos;da paylaşılan tüm mağaza tasarımları - onay mekanizması yok, yayınlanan
        tasarımlar hemen görünür oluyor. Uygunsuz bir tasarımı ya da yorumu buradan kaldır.
      </p>

      <form onSubmit={handleSearch} className="mt-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Başlık ya da yazarın kullanıcı adı ile ara"
          className="w-full max-w-sm rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
        />
        <button type="submit" className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
          Ara
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">Başlık</th>
              <th className="px-4 py-2 font-medium">Yazar</th>
              <th className="px-4 py-2 font-medium">Kurulum</th>
              <th className="px-4 py-2 font-medium">Puan</th>
              <th className="px-4 py-2 font-medium">Yorum</th>
              <th className="px-4 py-2 font-medium">Tarih</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {listings === null && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  Yükleniyor...
                </td>
              </tr>
            )}
            {listings?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  Sonuç bulunamadı.
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
                  <td className="px-4 py-2.5 text-zinc-500">{new Date(l.createdAt).toLocaleDateString("tr-TR")}</td>
                  <td className="px-4 py-2.5 text-right">
                    {confirmingDeleteId === l.id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-xs text-zinc-500">Emin misin?</span>
                        <button
                          onClick={() => handleDeleteListing(l.id)}
                          disabled={deletingId === l.id}
                          className="rounded-md border border-red-800 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                        >
                          {deletingId === l.id ? "..." : "Evet, sil"}
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(null)}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-600"
                        >
                          Vazgeç
                        </button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => toggleExpand(l.id)}
                          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-violet-700 hover:text-violet-300"
                        >
                          {expandedId === l.id ? "Kapat" : "Yorumlar"}
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(l.id)}
                          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-red-800 hover:text-red-400"
                        >
                          Sil
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
                        <p className="text-xs text-zinc-500">Yükleniyor...</p>
                      )}
                      {reviews?.length === 0 && (
                        <p className="text-xs text-zinc-500">Bu tasarıma henüz yorum yapılmamış.</p>
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
                                    {deletingReviewId === r.id ? "..." : "Evet, sil"}
                                  </button>
                                  <button
                                    onClick={() => setConfirmingDeleteReviewId(null)}
                                    className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-600"
                                  >
                                    Vazgeç
                                  </button>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setConfirmingDeleteReviewId(r.id)}
                                  className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-red-800 hover:text-red-400"
                                >
                                  Sil
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

const SCAN_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "Tümü", value: "" },
  { label: "Beklemede", value: "Pending" },
  { label: "Devam ediyor", value: "InProgress" },
  { label: "Tamamlandı", value: "Completed" },
  { label: "Süresi doldu", value: "Expired" },
  { label: "Başarısız", value: "Failed" },
  { label: "İptal edildi", value: "Cancelled" },
];

// Cross-server - every scan any server has ever run, not just one team's own (see the
// [id] detail page and AdminController.ListScans/DeleteScan). Distinct from /scans, which
// only ever shows the currently-selected server's own scans to that server's own admins.
function ScansTab() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [scans, setScans] = useState<AdminScanSummaryResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback((q?: string, s?: string) => {
    listAdminScans(q, s)
      .then(setScans)
      .catch((err) => setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı."));
  }, []);

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
      setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı.");
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-zinc-400">
        Platformdaki tüm sunucularda, tüm kullanıcılar tarafından yapılmış her tarama - kendi
        sunucundan bağımsız.
      </p>

      <form onSubmit={handleSearch} className="mt-4 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Oyuncu, sunucu ya da taramayı başlatan kullanıcı ile ara"
          className="w-full max-w-sm rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-200 outline-none focus:border-violet-600"
        >
          {SCAN_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
          Ara
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">Oyuncu</th>
              <th className="px-4 py-2 font-medium">Sunucu</th>
              <th className="px-4 py-2 font-medium">Başlatan</th>
              <th className="px-4 py-2 font-medium">Durum</th>
              <th className="px-4 py-2 font-medium">Risk</th>
              <th className="px-4 py-2 font-medium">Tespit</th>
              <th className="px-4 py-2 font-medium">Tarih</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {scans === null && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-zinc-500">
                  Yükleniyor...
                </td>
              </tr>
            )}
            {scans?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-zinc-500">
                  Sonuç bulunamadı.
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
                <td className="px-4 py-2.5 text-zinc-500">{new Date(s.createdAt).toLocaleString("tr-TR")}</td>
                <td className="px-4 py-2.5 text-right">
                  {confirmingDeleteId === s.id ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-xs text-zinc-500">Emin misin?</span>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="rounded-md border border-red-800 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                      >
                        {deletingId === s.id ? "..." : "Evet, sil"}
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-600"
                      >
                        Vazgeç
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Link
                        href={`/admin/scans/${s.id}`}
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-violet-700 hover:text-violet-300"
                      >
                        Detay
                      </Link>
                      <button
                        onClick={() => setConfirmingDeleteId(s.id)}
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-red-800 hover:text-red-400"
                      >
                        Sil
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
