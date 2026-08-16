"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, addMember, listMembers, removeMember, type ServerMemberResponse } from "@/lib/api";
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
  discordUsername: string;
  adding: string;
  add: string;
  user: string;
  role: string;
  addedOn: string;
  loading: string;
  owner: string;
  member: string;
  remove: string;
}> = {
  tr: {
    gateTitle: "Kurumsal - ekip yönetimi",
    gateBody:
      "Sunucuna birden fazla yönetici eklemek, taramaları ve tespitleri birlikte yönetmek için Enterprise planına geçmen gerekiyor.",
    upgrade: "Enterprise'a yükselt",
    title: "Kurumsal",
    seatsLabel: "kişi",
    subtitle:
      "Bu sunucuyu birlikte yönetecek ekip arkadaşlarını Discord kullanıcı adlarıyla ekle. Eklenecek kişinin daha önce en az bir kez Discord ile NexusGuard'a giriş yapmış olması gerekir.",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    seatsFull: "Bu sunucunun {seats} kişilik kontenjanı dolu. Daha fazla kişi eklemek için Discord'dan daha yüksek kapasiteli bir Enterprise paketine geç.",
    discordUsername: "Discord kullanıcı adı",
    adding: "Ekleniyor...",
    add: "Ekle",
    user: "Kullanıcı",
    role: "Rol",
    addedOn: "Eklendi",
    loading: "Yükleniyor...",
    owner: "Sahip",
    member: "Üye",
    remove: "Kaldır",
  },
  en: {
    gateTitle: "Enterprise - team management",
    gateBody:
      "You need to be on the Enterprise plan to add multiple admins to your server and manage scans and detections together.",
    upgrade: "Upgrade to Enterprise",
    title: "Enterprise",
    seatsLabel: "seats",
    subtitle:
      "Add teammates who'll manage this server with you by their Discord username. Anyone you add must have signed in to NexusGuard with Discord at least once before.",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    seatsFull: "This server's {seats}-seat capacity is full. To add more people, upgrade to a higher-capacity Enterprise package on Discord.",
    discordUsername: "Discord username",
    adding: "Adding...",
    add: "Add",
    user: "User",
    role: "Role",
    addedOn: "Added",
    loading: "Loading...",
    owner: "Owner",
    member: "Member",
    remove: "Remove",
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

      {seatsFull ? (
        <p className="mt-6 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-300">
          {t.seatsFull.replace("{seats}", String(seats))}
        </p>
      ) : (
        <AddMemberForm
          apiKey={session.apiKey}
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
                apiKey={session.apiKey}
                serverId={session.serverId}
                t={t}
                locale={locale}
                onRemoved={() => setMembers((prev) => prev?.filter((x) => x.id !== m.id) ?? null)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddMemberForm({
  apiKey,
  serverId,
  t,
  onAdded,
}: {
  apiKey: string;
  serverId: string;
  t: { discordUsername: string; adding: string; add: string; apiUnreachable: string };
  onAdded: (m: ServerMemberResponse) => void;
}) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const member = await addMember(apiKey, serverId, username.trim());
      onAdded(member);
      setUsername("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder={t.discordUsername}
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
  apiKey,
  serverId,
  t,
  locale,
  onRemoved,
}: {
  member: ServerMemberResponse;
  apiKey: string;
  serverId: string;
  t: { owner: string; member: string; remove: string };
  locale: "tr" | "en";
  onRemoved: () => void;
}) {
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    try {
      await removeMember(apiKey, serverId, member.id);
      onRemoved();
    } catch {
      setRemoving(false);
    }
  }

  return (
    <tr>
      <td className="px-4 py-2.5 font-medium text-zinc-200">{member.username}</td>
      <td className="px-4 py-2.5 text-zinc-400">{member.role === "Owner" ? t.owner : t.member}</td>
      <td className="px-4 py-2.5 text-zinc-500">
        {new Date(member.addedAt).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR")}
      </td>
      <td className="px-4 py-2.5 text-right">
        {member.role !== "Owner" && (
          <button
            onClick={handleRemove}
            disabled={removing}
            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-red-800 hover:text-red-400 disabled:opacity-50"
          >
            {removing ? "..." : t.remove}
          </button>
        )}
      </td>
    </tr>
  );
}
