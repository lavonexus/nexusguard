"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, addMember, listMembers, removeMember, type ServerMemberResponse } from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";

export default function TeamPage() {
  const router = useRouter();
  const { session, server, loading } = useServerContext();
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
      .catch((err) => setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı."));
  }, [session, server, loading, router]);

  if (loading || !session) return null;

  if (server?.plan !== "Enterprise") {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-violet-800/60 bg-violet-950/30 text-violet-300">
          👥
        </div>
        <h1 className="mt-4 text-xl font-semibold text-white">Kurumsal - ekip yönetimi</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Sunucuna birden fazla yönetici eklemek, taramaları ve tespitleri birlikte yönetmek için
          Enterprise planına geçmen gerekiyor.
        </p>
        <Link
          href="/pricing"
          className="mt-6 inline-block rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Enterprise&apos;a yükselt
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
        <h1 className="text-xl font-semibold text-white">Kurumsal</h1>
        {seats > 0 && (
          <span className="rounded-full border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
            {seatsUsed} / {seats} kişi
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-400">
        Bu sunucuyu birlikte yönetecek ekip arkadaşlarını Discord kullanıcı adlarıyla ekle. Eklenecek
        kişinin daha önce en az bir kez Discord ile NexusGuard&apos;a giriş yapmış olması gerekir.
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {seatsFull ? (
        <p className="mt-6 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-300">
          Bu sunucunun {seats} kişilik kontenjanı dolu. Daha fazla kişi eklemek için Discord&apos;dan
          daha yüksek kapasiteli bir Enterprise paketine geç.
        </p>
      ) : (
        <AddMemberForm
          apiKey={session.apiKey}
          serverId={session.serverId}
          onAdded={(m) => setMembers((prev) => (prev ? [...prev, m] : [m]))}
        />
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">Kullanıcı</th>
              <th className="px-4 py-2 font-medium">Rol</th>
              <th className="px-4 py-2 font-medium">Eklendi</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {members === null && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                  Yükleniyor...
                </td>
              </tr>
            )}
            {members?.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                apiKey={session.apiKey}
                serverId={session.serverId}
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
  onAdded,
}: {
  apiKey: string;
  serverId: string;
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
      setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Discord kullanıcı adı"
        className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Ekleniyor..." : "Ekle"}
      </button>
      {error && <p className="ml-2 self-center text-xs text-red-400">{error}</p>}
    </form>
  );
}

function MemberRow({
  member,
  apiKey,
  serverId,
  onRemoved,
}: {
  member: ServerMemberResponse;
  apiKey: string;
  serverId: string;
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
      <td className="px-4 py-2.5 text-zinc-400">{member.role === "Owner" ? "Sahip" : "Üye"}</td>
      <td className="px-4 py-2.5 text-zinc-500">{new Date(member.addedAt).toLocaleDateString("tr-TR")}</td>
      <td className="px-4 py-2.5 text-right">
        {member.role !== "Owner" && (
          <button
            onClick={handleRemove}
            disabled={removing}
            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-red-800 hover:text-red-400 disabled:opacity-50"
          >
            {removing ? "..." : "Kaldır"}
          </button>
        )}
      </td>
    </tr>
  );
}
