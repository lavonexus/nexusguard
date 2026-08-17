"use client";

import { useState } from "react";
import { ApiError, addMember, removeMember, setMemberRole, type ServerMemberResponse } from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useT, type Dict } from "@/lib/i18n/useT";
import { useEnterpriseRole } from "@/lib/useEnterpriseRole";
import EnterpriseGate from "@/components/EnterpriseGate";

const STRINGS: Dict<{
  title: string;
  seatsLabel: string;
  subtitle: string;
  apiUnreachable: string;
  seatsFull: string;
  identifierPlaceholder: string;
  searchPlaceholder: string;
  adding: string;
  add: string;
  user: string;
  role: string;
  addedOn: string;
  scans: string;
  lastActive: string;
  never: string;
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
    title: "Üyeler",
    seatsLabel: "kişi",
    subtitle:
      "Bu sunucuyu birlikte yönetecek ekip arkadaşlarını ekle: Discord ile giriş yapanları kullanıcı adı ya da Discord ID'siyle, Google ile giriş yapanları kayıtlı e-postalarıyla.",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    seatsFull: "Bu sunucunun {seats} kişilik kontenjanı dolu. Daha fazla kişi eklemek için Discord'dan daha yüksek kapasiteli bir Enterprise paketine geç.",
    identifierPlaceholder: "Discord kullanıcı adı, Discord ID ya da Google e-postası",
    searchPlaceholder: "Üye ara...",
    adding: "Ekleniyor...",
    add: "Ekle",
    user: "Kullanıcı",
    role: "Rol",
    addedOn: "Eklendi",
    scans: "Tarama",
    lastActive: "Son aktivite",
    never: "Hiç",
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
    title: "Members",
    seatsLabel: "seats",
    subtitle:
      "Add teammates who'll manage this server with you: by Discord username or Discord ID for Discord logins, or by their registered email for Google logins.",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    seatsFull: "This server's {seats}-seat capacity is full. To add more people, upgrade to a higher-capacity Enterprise package on Discord.",
    identifierPlaceholder: "Discord username, Discord ID, or Google email",
    searchPlaceholder: "Search members...",
    adding: "Adding...",
    add: "Add",
    user: "User",
    role: "Role",
    addedOn: "Added",
    scans: "Scans",
    lastActive: "Last active",
    never: "Never",
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

export default function TeamMembersPage() {
  return (
    <EnterpriseGate>
      <MembersContent />
    </EnterpriseGate>
  );
}

function MembersContent() {
  const { session, server } = useServerContext();
  const { locale } = useLocale();
  const t = useT(STRINGS);
  const { members, isOwner, canManage, refresh } = useEnterpriseRole();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  if (!session) return null;

  const seats = server?.enterpriseSeats ?? 0;
  const seatsUsed = members?.length ?? 0;
  const seatsFull = members !== null && seatsUsed >= seats;

  const filtered = members?.filter((m) => m.username.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="max-w-3xl">
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
        <AddMemberForm serverId={session.serverId} t={t} onAdded={refresh} />
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t.searchPlaceholder}
        className="mt-6 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
      />

      <div className="mt-3 space-y-1.5">
        {members === null && <p className="py-6 text-center text-sm text-zinc-500">{t.loading}</p>}
        {filtered?.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            serverId={session.serverId}
            t={t}
            locale={locale}
            canRemove={canManage}
            isOwnerViewer={isOwner}
            onRemoved={refresh}
            onRoleChanged={refresh}
          />
        ))}
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
  onAdded: () => void;
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
      await addMember(serverId, identifier.trim());
      onAdded();
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
  t: {
    owner: string; member: string; manager: string; remove: string; makeManager: string; revokeManager: string;
    scans: string; lastActive: string; never: string; addedOn: string;
  };
  locale: "tr" | "en";
  canRemove: boolean;
  isOwnerViewer: boolean;
  onRemoved: () => void;
  onRoleChanged: () => void;
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
      await setMemberRole(serverId, member.id, member.role === "Manager" ? "Member" : "Manager");
      onRoleChanged();
    } catch {
      // Best-effort - the row just stays as it was, no separate error surface for this toggle.
    } finally {
      setChangingRole(false);
    }
  }

  const roleLabel = member.role === "Owner" ? t.owner : member.role === "Manager" ? t.manager : t.member;
  const dateFmt = locale === "en" ? "en-US" : "tr-TR";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-sm font-semibold text-violet-300">
        {member.username.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-zinc-200">{member.username}</span>
          <span className="shrink-0 rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
            {roleLabel}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">
          {t.addedOn} {new Date(member.addedAt).toLocaleDateString(dateFmt)}
        </div>
      </div>

      <div className="shrink-0 text-right text-xs text-zinc-500">
        <div>{member.scanCount} {t.scans}</div>
        <div>{member.lastActiveAt ? new Date(member.lastActiveAt).toLocaleDateString(dateFmt) : t.never}</div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
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
    </div>
  );
}
