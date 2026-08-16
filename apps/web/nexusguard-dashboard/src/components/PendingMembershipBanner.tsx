"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, listMyServers, rotateApiKeyAsOwner, type MyServerResponse } from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import { saveSession } from "@/lib/session";
import { useT, type Dict } from "@/lib/i18n/useT";

const STRINGS: Dict<{
  addedTo: string;
  join: string;
  joining: string;
  confirmBody: string;
  confirmJoin: string;
  cancel: string;
  apiUnreachable: string;
}> = {
  tr: {
    addedTo: "sunucusuna Enterprise ekibi üyesi olarak eklendin.",
    join: "Katıl",
    joining: "Katılınıyor...",
    confirmBody:
      "Katılmak, bu sunucunun API anahtarını yeniler - sahibinin ya da diğer üyelerin o anda kullandığı eski anahtar (ve varsa Scanner/entegrasyon bağlantıları) anında geçersiz kalır.",
    confirmJoin: "Anladım, katıl",
    cancel: "Vazgeç",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
  },
  en: {
    addedTo: "added you to the Enterprise team on",
    join: "Join",
    joining: "Joining...",
    confirmBody:
      "Joining rotates this server's API key - the old key the owner or other members are currently using (and any Scanner/integration links using it) will stop working immediately.",
    confirmJoin: "I understand, join",
    cancel: "Cancel",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
  },
};

// Surfaces on every dashboard page (mounted once, inside ServerProvider - see AppShell.tsx)
// so a freshly-added Enterprise team member notices their new membership without needing to
// know about the "switch server" flow, wherever they currently are. Deliberately not fully
// automatic: joining rotates the server's one shared API key (the only way to hand out a
// usable plaintext key at all, since only its hash is ever stored - see Server.ApiKeyHash),
// which immediately breaks whatever the owner/other members currently have cached. A silent
// background rotation would be a surprise outage for them; this keeps it a single informed
// click instead.
export default function PendingMembershipBanner() {
  const { session, user } = useServerContext();
  const router = useRouter();
  const t = useT(STRINGS);

  const [pending, setPending] = useState<MyServerResponse[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    listMyServers()
      .then((list) => {
        setPending(list.filter((s) => s.role === "Member" && s.plan === "Enterprise" && s.id !== session.serverId));
      })
      .catch(() => {
        // Best-effort notice, not core functionality - a failed check here shouldn't show an
        // error anywhere the user didn't ask to see one.
      });
  }, [session, session?.serverId]);

  async function handleJoin(target: MyServerResponse) {
    if (!session) return;
    setJoiningId(target.id);
    setError(null);
    try {
      const { apiKey } = await rotateApiKeyAsOwner(target.id);
      saveSession({ userId: session.userId, serverId: target.id, serverName: target.name, apiKey });
      router.push("/overview");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
      setJoiningId(null);
    }
  }

  if (!user || pending.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {pending.map((server) => (
        <div
          key={server.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-800/50 bg-violet-950/20 px-4 py-3"
        >
          <p className="text-sm text-violet-200">
            <strong>{server.name}</strong> {t.addedTo}
          </p>

          {confirmingId === server.id ? (
            <div className="flex flex-col items-end gap-1.5">
              <p className="max-w-md text-right text-xs text-amber-300">{t.confirmBody}</p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleJoin(server)}
                  disabled={joiningId === server.id}
                  className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {joiningId === server.id ? t.joining : t.confirmJoin}
                </button>
                <button
                  onClick={() => setConfirmingId(null)}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingId(server.id)}
              className="shrink-0 rounded-md bg-violet-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-500"
            >
              {t.join}
            </button>
          )}
        </div>
      ))}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
