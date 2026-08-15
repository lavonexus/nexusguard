"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  ApiError,
  DISCORD_LOGIN_URL,
  GOOGLE_LOGIN_URL,
  createServerForCurrentUser,
  getCurrentUser,
  listMyServers,
  renameServerAsOwner,
  rotateApiKeyAsOwner,
  type MyServerResponse,
  type UserResponse,
} from "@/lib/api";
import { saveSession } from "@/lib/session";

type AuthState = "checking" | "signed-out" | "signed-in";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_state_mismatch: "Giriş süresi doldu ya da bozuldu - tekrar dene.",
  oauth_exchange_failed: "Giriş sağlayıcı girişi onaylamadı - tekrar dene.",
};

export default function SetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupPageContent />
    </Suspense>
  );
}

function SetupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");

  const [authState, setAuthState] = useState<AuthState>("checking");
  const [user, setUser] = useState<UserResponse | null>(null);
  const [servers, setServers] = useState<MyServerResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ id: string; name: string; apiKey: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  // First-ever login (zero servers) provisions one silently and skips this page entirely -
  // this flag just keeps the "yükleniyor" state up while that happens instead of flashing the
  // server list first.
  const [autoProvisioning, setAutoProvisioning] = useState(false);
  // React StrictMode double-invokes effects in dev (mount → unmount → mount) specifically to
  // surface non-idempotent side effects like this one - without this guard, a brand-new user
  // would get two servers auto-created from a single page load. A ref (not state) survives
  // that unmount/remount cycle without itself triggering a re-render.
  const provisionStarted = useRef(false);

  useEffect(() => {
    let currentUser: UserResponse | null = null;

    getCurrentUser()
      .then((u) => {
        currentUser = u;
        setUser(u);
        setAuthState("signed-in");
        return listMyServers();
      })
      .then(async (list) => {
        if (list.length === 0) {
          if (provisionStarted.current) return;
          provisionStarted.current = true;
          setAutoProvisioning(true);
          const server = await createServerForCurrentUser("FiveM Sunucum");
          saveSession({
            userId: currentUser!.id,
            serverId: server.id,
            serverName: server.name,
            apiKey: server.apiKey,
          });
          router.replace("/overview");
          return;
        }
        setServers(list);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setAuthState("signed-out");
        } else {
          setError("NexusGuard API'ye ulaşılamadı.");
          setAuthState("signed-out");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleContinue() {
    if (!revealed) return;
    saveSession({
      userId: user!.id,
      serverId: revealed.id,
      serverName: revealed.name,
      apiKey: revealed.apiKey,
    });
    router.push("/overview");
  }

  async function handleCopy() {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (authState === "checking" || autoProvisioning) {
    return <p className="mt-6 text-center text-sm text-zinc-500">Yükleniyor...</p>;
  }

  if (authState === "signed-out") {
    return (
      <div className="mx-auto max-w-sm text-center">
        <h1 className="text-xl font-semibold text-white">NexusGuard&apos;a giriş yap</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Yönetici erişimi Discord ya da Google hesabınla bağlantılıdır.
        </p>

        {oauthError && (
          <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
            {OAUTH_ERROR_MESSAGES[oauthError] ?? "Giriş başarısız - tekrar dene."}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <a
          href={DISCORD_LOGIN_URL}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#5865F2] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4752c4]"
        >
          <DiscordMark />
          Discord ile giriş yap
        </a>

        <div className="mt-3 flex items-center gap-3 text-xs text-zinc-600">
          <span className="h-px flex-1 bg-zinc-800" />
          veya
          <span className="h-px flex-1 bg-zinc-800" />
        </div>

        <a
          href={GOOGLE_LOGIN_URL}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100"
        >
          <GoogleMark />
          Google ile devam et
        </a>

        <p className="mt-4 text-xs text-zinc-600">
          Google ile giriş bu ortamda henüz yapılandırılmadı - önce Google Cloud Console&apos;dan bir
          OAuth istemcisi oluşturup sunucu tarafına eklemen gerekiyor.
        </p>
      </div>
    );
  }

  if (revealed) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-semibold text-white">{revealed.name}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Bu API anahtarını şimdi kaydet - yalnızca bir kez gösterilir, tekrar alınamaz, sadece
          yenilenebilir. Bot kurduysan Discord&apos;da{" "}
          <code className="text-zinc-300">/nexusguard-link</code> için gerekecek.
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-violet-400">
            {revealed.apiKey}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-600"
          >
            {copied ? "Kopyalandı" : "Kopyala"}
          </button>
        </div>

        <button
          onClick={handleContinue}
          className="mt-6 w-full rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          Dashboard'a devam et
        </button>
      </div>
    );
  }

  // A fresh Enterprise grant gets a focused, single-purpose screen instead of the general
  // server list - naming their server is the one thing standing between them and the panel.
  const soloServer = servers?.length === 1 ? servers[0] : null;
  if (soloServer && soloServer.role === "Owner" && soloServer.needsSetup) {
    return <EnterpriseOnboarding server={soloServer} onReady={setRevealed} />;
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold text-white">Hoş geldin, {user?.username}</h1>
      <p className="mt-1 text-sm text-zinc-400">Yöneteceğin bir sunucu seç ya da yeni bir tane oluştur.</p>

      {servers === null && <p className="mt-6 text-sm text-zinc-500">Sunucular yükleniyor...</p>}

      {servers !== null && servers.length > 0 && (
        <div className="mt-6 space-y-2">
          {servers.map((server) => (
            <ServerRow key={server.id} server={server} onReady={setRevealed} />
          ))}
        </div>
      )}

      <div className="mt-6 border-t border-zinc-800 pt-6">
        <NewServerForm onReady={setRevealed} />
      </div>
    </div>
  );
}

function EnterpriseOnboarding({
  server,
  onReady,
}: {
  server: MyServerResponse;
  onReady: (server: { id: string; name: string; apiKey: string }) => void;
}) {
  const [name, setName] = useState(server.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Sunucu adı gerekli.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const renamed = await renameServerAsOwner(server.id, name.trim());
      const { apiKey } = await rotateApiKeyAsOwner(server.id);
      onReady({ id: renamed.id, name: renamed.name, apiKey });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-800 bg-violet-950/50 px-2.5 py-1 text-xs font-medium text-violet-300">
        ✦ Enterprise&apos;a hoş geldin
      </span>
      <h1 className="mt-3 text-xl font-semibold text-white">Sunucuna bir isim ver</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Ekibinin panelde göreceği asıl sunucu adını gir - istediğin zaman Ayarlar&apos;dan
        değiştirebilirsin.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
          placeholder="Sunucu adı"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Kaydediliyor..." : "Kaydet ve Panele Eriş"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </div>
  );
}

function ServerRow({
  server,
  onReady,
}: {
  server: MyServerResponse;
  onReady: (server: { id: string; name: string; apiKey: string }) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUse() {
    setLoading(true);
    setError(null);
    try {
      const { apiKey } = await rotateApiKeyAsOwner(server.id);
      onReady({ id: server.id, name: server.name, apiKey });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı.");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">{server.name}</span>
            {server.role === "Member" && (
              <span className="rounded border border-violet-800 bg-violet-950/50 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                Ekip üyesi
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-500">
            {server.isActive ? "Aktif" : "Pasif"} · oluşturuldu{" "}
            {new Date(server.createdAt).toLocaleDateString("tr-TR")}
          </div>
        </div>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-600"
          >
            Bu sunucuyu kullan
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleUse}
              disabled={loading}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {loading ? "..." : "Onayla"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-600"
            >
              Vazgeç
            </button>
          </div>
        )}
      </div>

      {confirming && !error && (
        <p className="mt-2 text-xs text-amber-500">
          Bu sunucu için yeni bir API anahtarı verir - eski anahtar anında çalışmaz hale gelir.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function NewServerForm({
  onReady,
}: {
  onReady: (server: { id: string; name: string; apiKey: string }) => void;
}) {
  const [name, setName] = useState("My FiveM Server");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Sunucu adı gerekli.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const server = await createServerForCurrentUser(name.trim());
      onReady(server);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "NexusGuard API'ye ulaşılamadı.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm font-medium text-zinc-300">Yeni sunucu</label>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
          placeholder="FiveM Sunucum"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Oluşturuluyor..." : "Oluştur"}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}

function DiscordMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M20.3 4.9A19.8 19.8 0 0 0 15.6 3.4c-.2.4-.5.9-.6 1.3a18.3 18.3 0 0 0-5.5 0c-.2-.4-.4-.9-.6-1.3a19.7 19.7 0 0 0-4.7 1.5C1.7 8.9 1 12.8 1.3 16.6a19.9 19.9 0 0 0 6 3c.5-.6.9-1.3 1.3-2-.7-.3-1.4-.6-2-1.1l.5-.4a14.2 14.2 0 0 0 12 0l.4.4c-.6.4-1.3.8-2 1.1.4.7.8 1.4 1.3 2a19.8 19.8 0 0 0 6-3c.4-4.4-.7-8.3-2.9-11.7ZM9 14.6c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Zm6 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.4H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.3 21.3 7.3 24 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.4 6.6l4 3.1c.9-2.8 3.5-4.9 6.6-4.9Z" />
    </svg>
  );
}
