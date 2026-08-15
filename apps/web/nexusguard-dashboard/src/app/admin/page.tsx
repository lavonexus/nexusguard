"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  adminCancelPlan,
  adminSetPlan,
  listAdminServers,
  listAdminUsers,
  setSiteAdmin,
  type AdminServerResponse,
  type AdminUserResponse,
  type Plan,
} from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";

type Tab = "users" | "servers";

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
      </div>

      {tab === "servers" && <ServersTab />}
      {tab === "users" && <UsersTab currentUserId={user.id} />}
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
        <td className="px-4 py-2.5 font-medium text-zinc-200">{server.name}</td>
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
              <th className="px-4 py-2 font-medium">Discord</th>
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
                <td className="px-4 py-2.5 text-zinc-500">{u.discordLinked ? "Bağlı" : "—"}</td>
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
