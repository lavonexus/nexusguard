"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, addMember, listMembers, removeMember, setMemberRole, type ServerMemberResponse } from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useT, type Dict } from "@/lib/i18n/useT";

const STRINGS: Dict<{
  gateTitle: string;
  gateBody: string;
  upgrade: string;
  title: string;
  seatsLabel: string;
  subtitle: string;
  apiUnreachable: string;
  seatsFull: string;
  identifierPlaceholder: string;
  adding: string;
  add: string;
  user: string;
  role: string;
  addedOn: string;
  loading: string;
  owner: string;
  member: string;
  manager: string;
  remove: string;
  makeManager: string;
  revokeManager: string;
  readOnlyNotice: string;
}> = {
  tr: {
    gateTitle: "Kurumsal - ekip yönetimi",
    gateBody:
      "Sunucuna birden fazla yönetici eklemek, taramaları ve tespitleri birlikte yönetmek için Enterprise planına geçmen gerekiyor.",
    upgrade: "Enterprise'a yükselt",
    title: "Kurumsal",
    seatsLabel: "kişi",
    subtitle:
      "Bu sunucuyu birlikte yönetecek ekip arkadaşlarını ekle: Discord ile giriş yapanları kullanıcı adı ya da Discord ID'siyle, Google ile giriş yapanları kayıtlı e-postalarıyla. Eklenecek kişinin daha önce en az bir kez NexusGuard'a giriş yapmış olması gerekir.",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    seatsFull: "Bu sunucunun {seats} kişilik kontenjanı dolu. Daha fazla kişi eklemek için Discord'dan daha yüksek kapasiteli bir Enterprise paketine geç.",
    identifierPlaceholder: "Discord kullanıcı adı, Discord ID ya da Google e-postası",
    adding: "Ekleniyor...",
    add: "Ekle",
    user: "Kullanıcı",
    role: "Rol",
    addedOn: "Eklendi",
    loading: "Yükleniyor...",
    owner: "Sahip",
    member: "Üye",
    manager: "Yönetici",
    remove: "Kaldır",
    makeManager: "Yönetici yap",
    revokeManager: "Yöneticiliği al",
    readOnlyNotice: "Üye ekleyip çıkarmak için sahip ya da yönetici olman gerekiyor.",
  },
  en: {
    gateTitle: "Enterprise - team management",
    gateBody:
      "You need to be on the Enterprise plan to add multiple admins to your server and manage scans and detections together.",
    upgrade: "Upgrade to Enterprise",
    title: "Enterprise",
    seatsLabel: "seats",
    subtitle:
      "Add teammates who'll manage this server with you: by Discord username or Discord ID for Discord logins, or by their registered email for Google logins. Anyone you add must have signed in to NexusGuard at least once before.",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    seatsFull: "This server's {seats}-seat capacity is full. To add more people, upgrade to a higher-capacity Enterprise package on Discord.",
    identifierPlaceholder: "Discord username, Discord ID, or Google email",
    adding: "Adding...",
    add: "Add",
    user: "User",
    role: "Role",
    addedOn: "Added",
    loading: "Loading...",
    owner: "Owner",
    member: "Member",
    manager: "Manager",
    remove: "Remove",
    makeManager: "Make manager",
    revokeManager: "Revoke manager",
    readOnlyNotice: "You need to be the owner or a manager to add or remove members.",
  },
};

export default function TeamPage() {
  const router = useRouter();
  const { session, server, loading } = useServerContext();
  const { locale } = useLocale();
  const t = useT(STRINGS);
  const [members, setMembers] = useState<ServerMemberResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/setup");
      return;
    }
    if (server?.plan !== "Enterprise") return;

    listMembers(session.apiKey, session.serverId)
      .then(setMembers)
      .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
  }, [session, server, loading, router, t.apiUnreachable]);

  if (loading || !session) return null;

  if (server?.plan !== "Enterprise") {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-violet-800/60 bg-violet-950/30 text-violet-300">
          👥
        </div>
        <h1 className="mt-4 text-xl font-semibold text-white">{t.gateTitle}</h1>
        <p className="mt-2 text-sm text-zinc-400">{t.gateBody}</p>
        <Link
          href="/pricing"
          className="mt-6 inline-block rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          {t.upgrade}
        </Link>
      </div>
    );
  }

  const seats = server?.enterpriseSeats ?? 0;
  const seatsUsed = members?.length ?? 0;
  const seatsFull = members !== null && seatsUsed >= seats;

  // The API key is now shared with every joined member (see PendingMembershipBanner), so it
  // can no longer stand in for "who is this." Whether the signed-in caller can add/remove
  // people is read off their own row in the roster we already fetched, not assumed from
  // holding the key.
  const myRole = members?.find((m) => m.userId === session.userId)?.role;
  const isOwner = myRole === "Owner";
  const canManage = isOwner || myRole === "Manager";

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">{t.title}</h1>
        {seats > 0 && (
          <span className="rounded-full border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
            {seatsUsed} / {seats} {t.seatsLabel}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-400">{t.subtitle}</p>

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {members !== null && !canManage ? (
        <p className="mt-6 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-400">
          {t.readOnlyNotice}
        </p>
      ) : seatsFull ? (
        <p className="mt-6 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-300">
          {t.seatsFull.replace("{seats}", String(seats))}
        </p>
      ) : (
        <AddMemberForm
          serverId={session.serverId}
          t={t}
          onAdded={(m) => setMembers((prev) => (prev ? [...prev, m] : [m]))}
        />
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">{t.user}</th>
              <th className="px-4 py-2 font-medium">{t.role}</th>
              <th className="px-4 py-2 font-medium">{t.addedOn}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {members === null && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                  {t.loading}
                </td>
              </tr>
            )}
            {members?.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                serverId={session.serverId}
                t={t}
                locale={locale}
                canRemove={canManage}
                isOwnerViewer={isOwner}
                onRemoved={() => setMembers((prev) => prev?.filter((x) => x.id !== m.id) ?? null)}
                onRoleChanged={(updated) =>
                  setMembers((prev) => prev?.map((x) => (x.id === updated.id ? updated : x)) ?? null)
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddMemberForm({
  serverId,
  t,
  onAdded,
}: {
  serverId: string;
  t: { identifierPlaceholder: string; adding: string; add: string; apiUnreachable: string };
  onAdded: (m: ServerMemberResponse) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const member = await addMember(serverId, identifier.trim());
      onAdded(member);
      setIdentifier("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
      <input
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        placeholder={t.identifierPlaceholder}
        className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? t.adding : t.add}
      </button>
      {error && <p className="ml-2 self-center text-xs text-red-400">{error}</p>}
    </form>
  );
}

function MemberRow({
  member,
  serverId,
  t,
  locale,
  canRemove,
  isOwnerViewer,
  onRemoved,
  onRoleChanged,
}: {
  member: ServerMemberResponse;
  serverId: string;
  t: { owner: string; member: string; manager: string; remove: string; makeManager: string; revokeManager: string };
  locale: "tr" | "en";
  canRemove: boolean;
  isOwnerViewer: boolean;
  onRemoved: () => void;
  onRoleChanged: (updated: ServerMemberResponse) => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [changingRole, setChangingRole] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    try {
      await removeMember(serverId, member.id);
      onRemoved();
    } catch {
      setRemoving(false);
    }
  }

  async function handleToggleManager() {
    setChangingRole(true);
    try {
      const updated = await setMemberRole(serverId, member.id, member.role === "Manager" ? "Member" : "Manager");
      onRoleChanged(updated);
    } catch {
      // Best-effort - the row just stays as it was, no separate error surface for this toggle.
    } finally {
      setChangingRole(false);
    }
  }

  const roleLabel = member.role === "Owner" ? t.owner : member.role === "Manager" ? t.manager : t.member;

  return (
    <tr>
      <td className="px-4 py-2.5 font-medium text-zinc-200">{member.username}</td>
      <td className="px-4 py-2.5 text-zinc-400">{roleLabel}</td>
      <td className="px-4 py-2.5 text-zinc-500">
        {new Date(member.addedAt).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR")}
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {isOwnerViewer && member.role !== "Owner" && (
            <button
              onClick={handleToggleManager}
              disabled={changingRole}
              className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-violet-700 hover:text-violet-300 disabled:opacity-50"
            >
              {changingRole ? "..." : member.role === "Manager" ? t.revokeManager : t.makeManager}
            </button>
          )}
          {canRemove && member.role !== "Owner" && (
            <button
              onClick={handleRemove}
              disabled={removing}
              className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-red-800 hover:text-red-400 disabled:opacity-50"
            >
              {removing ? "..." : t.remove}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
