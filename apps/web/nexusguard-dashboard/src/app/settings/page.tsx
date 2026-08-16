"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ApiError,
  DISCORD_LOGIN_URL,
  getCurrentUser,
  getServer,
  logout,
  renameServer,
  rotateApiKey,
  updateDisplayName,
  type ServerResponse,
  type UserResponse,
} from "@/lib/api";
import { clearSession, loadSession, updateApiKey, updateServerName, type ServerSession } from "@/lib/session";
import { useLocale, type Locale } from "@/lib/i18n/LocaleContext";
import { useT, type Dict } from "@/lib/i18n/useT";

type Tab = "account" | "server";

const STRINGS: Dict<{
  memberSince: string;
  plan: string;
  memberDate: string;
  linked: string;
  notLinked: string;
  apiUnreachable: string;
  account: string;
  server: string;
  loading: string;
  loginToSeeAccount: string;
  loginWithDiscord: string;
  securityPrivacy: string;
  activeSessions: string;
  devices: string;
  logoutThisDevice: string;
  linkedAccounts: string;
  twoFactorNote: string;
  displayName: string;
  saving: string;
  saved: string;
  save: string;
  email: string;
  noEmailFromDiscord: string;
  serverName: string;
  cancel: string;
  edit: string;
  serverId: string;
  status: string;
  active: string;
  inactive: string;
  registeredOn: string;
  apiKey: string;
  apiKeyDesc: string;
  copied: string;
  copy: string;
  rotateApiKey: string;
  rotating: string;
  confirm: string;
  serverNameRequired: string;
}> = {
  tr: {
    memberSince: "Üyelik başlangıcı",
    plan: "Plan",
    memberDate: "Üyelik tarihi",
    linked: "Bağlı",
    notLinked: "Bağlı değil",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    account: "Hesap",
    server: "Sunucu",
    loading: "Yükleniyor...",
    loginToSeeAccount: "Hesap bilgilerini görmek için Discord ya da Google ile giriş yapmalısın.",
    loginWithDiscord: "Discord ile giriş yap",
    securityPrivacy: "Güvenlik ve Gizlilik",
    activeSessions: "Aktif oturumlar",
    devices: "cihaz",
    logoutThisDevice: "Bu cihazdan çıkış yap",
    linkedAccounts: "Bağlı Hesaplar",
    twoFactorNote: "İki adımlı doğrulama Discord/Google hesabın üzerinden yönetiliyor - NexusGuard ayrı bir şifre tutmuyor.",
    displayName: "Görünen Ad",
    saving: "Kaydediliyor...",
    saved: "Kaydedildi",
    save: "Kaydet",
    email: "E-posta",
    noEmailFromDiscord: "Discord hesabın e-posta paylaşmıyor",
    serverName: "Sunucu adı",
    cancel: "Vazgeç",
    edit: "Düzenle",
    serverId: "Sunucu ID",
    status: "Durum",
    active: "Aktif",
    inactive: "Pasif",
    registeredOn: "Kayıt tarihi",
    apiKey: "API anahtarı",
    apiKeyDesc:
      "Mevcut anahtar oluşturulduktan sonra bir daha gösterilmez. Yenilemek eski anahtarı anında geçersiz kılar - onu kullanan scanner/entegrasyonları güncellemeyi unutma.",
    copied: "Kopyalandı",
    copy: "Kopyala",
    rotateApiKey: "API anahtarını yenile",
    rotating: "Yenileniyor...",
    confirm: "Onayla",
    serverNameRequired: "Sunucu adı gerekli.",
  },
  en: {
    memberSince: "Member since",
    plan: "Plan",
    memberDate: "Member since",
    linked: "Linked",
    notLinked: "Not linked",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    account: "Account",
    server: "Server",
    loading: "Loading...",
    loginToSeeAccount: "You need to sign in with Discord or Google to see account details.",
    loginWithDiscord: "Sign in with Discord",
    securityPrivacy: "Security & Privacy",
    activeSessions: "Active sessions",
    devices: "devices",
    logoutThisDevice: "Log out this device",
    linkedAccounts: "Linked Accounts",
    twoFactorNote: "Two-factor auth is managed through your Discord/Google account - NexusGuard doesn't keep a separate password.",
    displayName: "Display Name",
    saving: "Saving...",
    saved: "Saved",
    save: "Save",
    email: "Email",
    noEmailFromDiscord: "Your Discord account doesn't share an email",
    serverName: "Server name",
    cancel: "Cancel",
    edit: "Edit",
    serverId: "Server ID",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    registeredOn: "Registered on",
    apiKey: "API key",
    apiKeyDesc:
      "The current key is never shown again after it's created. Rotating it invalidates the old key immediately - remember to update any scanner/integrations using it.",
    copied: "Copied",
    copy: "Copy",
    rotateApiKey: "Rotate API key",
    rotating: "Rotating...",
    confirm: "Confirm",
    serverNameRequired: "Server name is required.",
  },
};

export default function SettingsPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = useT(STRINGS);
  const [session, setSession] = useState<ServerSession | null>(null);
  const [server, setServer] = useState<ServerResponse | null>(null);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [userChecked, setUserChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("account");

  useEffect(() => {
    const s = loadSession();
    if (!s) {
      router.replace("/setup");
      return;
    }
    setSession(s);
    getServer(s.apiKey, s.serverId)
      .then(setServer)
      .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setUserChecked(true));
  }, [router, t.apiUnreachable]);

  if (!session) return null;

  const displayName = user?.displayName || user?.username || session.serverName;
  const initial = displayName.trim().charAt(0).toUpperCase() || "N";
  const dateLocale = locale === "en" ? "en-US" : "tr-TR";

  return (
    <div className="max-w-3xl">
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-b from-violet-950/30 to-transparent p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-600/20 text-2xl font-semibold text-violet-300">
          {initial}
        </div>
        <h1 className="mt-3 text-xl font-semibold text-white">{displayName}</h1>
        {user && (
          <p className="mt-1 text-xs text-zinc-500">
            {t.memberSince}: {new Date(user.createdAt).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoTile label={t.plan} value={server?.plan ?? "—"} />
        <InfoTile
          label={t.memberDate}
          value={user ? new Date(user.createdAt).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" }) : "—"}
        />
        <InfoTile
          label="Discord"
          value={user ? (user.discordLinked ? t.linked : t.notLinked) : "—"}
          tone={user?.discordLinked ? "good" : "default"}
        />
        <InfoTile
          label="Google"
          value={user ? (user.googleLinked ? t.linked : t.notLinked) : "—"}
          tone={user?.googleLinked ? "good" : "default"}
        />
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="mt-6 flex gap-1 border-b border-zinc-800">
        <TabButton active={tab === "account"} onClick={() => setTab("account")}>
          {t.account}
        </TabButton>
        <TabButton active={tab === "server"} onClick={() => setTab("server")}>
          {t.server}
        </TabButton>
      </div>

      {tab === "account" && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          {!userChecked ? (
            <p className="text-sm text-zinc-500">{t.loading}</p>
          ) : !user ? (
            <div className="rounded-lg border border-zinc-800 p-4 text-sm text-zinc-400">
              {t.loginToSeeAccount}
              <a href={DISCORD_LOGIN_URL} className="mt-3 block w-fit rounded-md bg-[#5865F2] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#4752c4]">
                {t.loginWithDiscord}
              </a>
            </div>
          ) : (
            <>
              <AccountForm user={user} t={t} onUpdated={setUser} />
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-800 p-4">
                  <h2 className="text-sm font-semibold text-violet-400">{t.securityPrivacy}</h2>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{t.activeSessions}</span>
                    <span className="text-zinc-200">
                      {user.activeSessionCount} {t.devices}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      clearSession();
                      try {
                        await logout();
                      } catch {
                        // Cookie may already be gone.
                      }
                      router.push("/setup");
                    }}
                    className="mt-3 w-full rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-600"
                  >
                    {t.logoutThisDevice}
                  </button>
                </div>

                <div className="rounded-xl border border-zinc-800 p-4">
                  <h2 className="text-sm font-semibold text-violet-400">{t.linkedAccounts}</h2>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs">
                      <span className="text-zinc-300">Discord</span>
                      <span className={user.discordLinked ? "text-emerald-400" : "text-zinc-500"}>
                        {user.discordLinked ? t.linked : t.notLinked}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs">
                      <span className="text-zinc-300">Google</span>
                      <span className={user.googleLinked ? "text-emerald-400" : "text-zinc-500"}>
                        {user.googleLinked ? t.linked : t.notLinked}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-600">{t.twoFactorNote}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "server" && session && <ServerTab session={session} server={server} t={t} locale={locale} onRenamed={setServer} />}
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

function InfoTile({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "good" }) {
  return (
    <div className="rounded-lg border border-zinc-800 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${tone === "good" ? "text-emerald-400" : "text-zinc-100"}`}>{value}</div>
    </div>
  );
}

function AccountForm({
  user,
  t,
  onUpdated,
}: {
  user: UserResponse;
  t: (typeof STRINGS)["tr"];
  onUpdated: (u: UserResponse) => void;
}) {
  const [name, setName] = useState(user.displayName ?? user.username);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateDisplayName(name.trim());
      onUpdated(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">{t.displayName}</label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
          />
          <button
            onClick={handleSave}
            disabled={saving || name.trim() === (user.displayName ?? user.username)}
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? t.saving : saved ? t.saved : t.save}
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">{t.email}</label>
        <input
          value={user.email ?? t.noEmailFromDiscord}
          readOnly
          className="w-full cursor-not-allowed rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-500"
        />
      </div>
    </div>
  );
}

function ServerTab({
  session,
  server,
  t,
  locale,
  onRenamed,
}: {
  session: ServerSession;
  server: ServerResponse | null;
  t: (typeof STRINGS)["tr"];
  locale: Locale;
  onRenamed: (server: ServerResponse) => void;
}) {
  const [rotating, setRotating] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(server?.name ?? session.serverName);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  async function handleRotate() {
    setRotating(true);
    setError(null);
    try {
      const result = await rotateApiKey(session.apiKey, session.serverId);
      updateApiKey(result.apiKey);
      setNewKey(result.apiKey);
      setConfirmRotate(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
    } finally {
      setRotating(false);
    }
  }

  async function handleCopy() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRename() {
    if (!nameDraft.trim()) {
      setRenameError(t.serverNameRequired);
      return;
    }
    setRenaming(true);
    setRenameError(null);
    try {
      const updated = await renameServer(session.apiKey, session.serverId, nameDraft.trim());
      updateServerName(updated.name);
      onRenamed(updated);
      setEditingName(false);
    } catch (err) {
      setRenameError(err instanceof ApiError ? err.message : t.apiUnreachable);
    } finally {
      setRenaming(false);
    }
  }

  return (
    <div className="mt-6 max-w-lg">
      <div className="space-y-4 rounded-lg border border-zinc-800 p-4">
        {editingName ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">{t.serverName}</span>
            <div className="flex items-center gap-2">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                autoFocus
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-200 outline-none focus:border-violet-600"
              />
              <button
                onClick={handleRename}
                disabled={renaming}
                className="rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {renaming ? "..." : t.save}
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setNameDraft(server?.name ?? session.serverName);
                  setRenameError(null);
                }}
                className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-600"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">{t.serverName}</span>
            <div className="flex items-center gap-2">
              <span className="text-zinc-200">{server?.name ?? session.serverName}</span>
              <button
                onClick={() => setEditingName(true)}
                className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              >
                {t.edit}
              </button>
            </div>
          </div>
        )}
        {renameError && <p className="text-xs text-red-400">{renameError}</p>}
        <Field label={t.serverId} value={session.serverId} mono />
        <Field label={t.status} value={server ? (server.isActive ? t.active : t.inactive) : "—"} />
        <Field label={t.registeredOn} value={server ? new Date(server.createdAt).toLocaleString(locale === "en" ? "en-US" : "tr-TR") : "—"} />
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-6 rounded-lg border border-zinc-800 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">{t.apiKey}</h2>
        <p className="mt-1 text-sm text-zinc-400">{t.apiKeyDesc}</p>

        {newKey && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-violet-400">{newKey}</code>
            <button onClick={handleCopy} className="shrink-0 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-600">
              {copied ? t.copied : t.copy}
            </button>
          </div>
        )}

        {!confirmRotate ? (
          <button
            onClick={() => setConfirmRotate(true)}
            className="mt-4 rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-600"
          >
            {t.rotateApiKey}
          </button>
        ) : (
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleRotate}
              disabled={rotating}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {rotating ? t.rotating : t.confirm}
            </button>
            <button
              onClick={() => setConfirmRotate(false)}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-600"
            >
              {t.cancel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={mono ? "font-mono text-zinc-300" : "text-zinc-200"}>{value}</span>
    </div>
  );
}
