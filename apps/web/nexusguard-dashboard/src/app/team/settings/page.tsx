"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, renameServer, updateServerSettings } from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import { useEnterpriseRole } from "@/lib/useEnterpriseRole";
import { useT, type Dict } from "@/lib/i18n/useT";
import EnterpriseGate from "@/components/EnterpriseGate";

const STRINGS: Dict<{
  title: string;
  subtitle: string;
  apiUnreachable: string;
  notOwner: string;
  identity: string;
  identityDesc: string;
  workspaceName: string;
  discordUrl: string;
  discordUrlPlaceholder: string;
  workspaceId: string;
  copy: string;
  copied: string;
  save: string;
  saved: string;
  saving: string;
  access: string;
  showAllScans: string;
  showAllScansDesc: string;
  branding: string;
  brandingDesc: string;
  logoUrl: string;
  logoUrlPlaceholder: string;
  logoUrlNote: string;
}> = {
  tr: {
    title: "Ayarlar",
    subtitle: "Bu çalışma alanı yalnızca sahip tarafından düzenlenebilir.",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    notOwner: "Bu sayfayı yalnızca çalışma alanının sahibi görüntüleyebilir.",
    identity: "Kimlik",
    identityDesc: "Ad, Discord adresi ve çalışma alanı kimliği.",
    workspaceName: "Kurumsal Alan Adı",
    discordUrl: "Discord Adresi",
    discordUrlPlaceholder: "discord.gg/sunucun",
    workspaceId: "Çalışma Alanı Kimliği",
    copy: "Kopyala",
    copied: "Kopyalandı",
    save: "Kaydet",
    saved: "Kaydedildi",
    saving: "Kaydediliyor...",
    access: "Erişim",
    showAllScans: "Tüm taramaları gör",
    showAllScansDesc: "Her üye, çalışma alanındaki diğerlerinin taramalarını görebilir.",
    branding: "Marka",
    brandingDesc: "Tarama sonuç sayfalarında çalışma alanı için gösterilen logo.",
    logoUrl: "Logo URL'si",
    logoUrlPlaceholder: "Logo ayarlanmadı",
    logoUrlNote: "Bir CDN'de (Discord, Imgur veya kendininki) barındırılan kare bir görsel kullan.",
  },
  en: {
    title: "Settings",
    subtitle: "This workspace can only be edited by the owner.",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    notOwner: "Only the workspace owner can view this page.",
    identity: "Identity",
    identityDesc: "Name, Discord address, and workspace identity.",
    workspaceName: "Enterprise Workspace Name",
    discordUrl: "Discord Address",
    discordUrlPlaceholder: "discord.gg/yourserver",
    workspaceId: "Workspace Identity",
    copy: "Copy",
    copied: "Copied",
    save: "Save",
    saved: "Saved",
    saving: "Saving...",
    access: "Access",
    showAllScans: "See all scans",
    showAllScansDesc: "Every member can see everyone else's scans in the workspace.",
    branding: "Branding",
    brandingDesc: "The logo shown for the workspace on scan result pages.",
    logoUrl: "Logo URL",
    logoUrlPlaceholder: "No logo set",
    logoUrlNote: "Use a square image hosted on a CDN (Discord, Imgur, or your own).",
  },
};

export default function TeamSettingsPage() {
  return (
    <EnterpriseGate>
      <SettingsContent />
    </EnterpriseGate>
  );
}

function SettingsContent() {
  const router = useRouter();
  const { session, server, refresh: refreshServer } = useServerContext();
  const { isOwner, loading: roleLoading } = useEnterpriseRole();
  const t = useT(STRINGS);

  const [name, setName] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [showAllScans, setShowAllScans] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isOwner) router.replace("/team");
  }, [roleLoading, isOwner, router]);

  useEffect(() => {
    if (!server || hydrated) return;
    setName(server.name);
    setDiscordUrl(server.discordUrl ?? "");
    setLogoUrl(server.logoUrl ?? "");
    setShowAllScans(server.showAllScansToMembers);
    setHydrated(true);
  }, [server, hydrated]);

  if (!session || roleLoading || !isOwner) return null;

  async function handleSave() {
    if (!session) return;
    setSaveState("saving");
    setError(null);
    try {
      if (name.trim() && name.trim() !== server?.name) {
        await renameServer(session.apiKey, session.serverId, name.trim());
      }
      await updateServerSettings(session.serverId, {
        discordUrl: discordUrl.trim() || null,
        showAllScansToMembers: showAllScans,
        logoUrl: logoUrl.trim() || null,
      });
      refreshServer();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
      setSaveState("idle");
    }
  }

  function handleCopyId() {
    if (!session) return;
    navigator.clipboard.writeText(session.serverId.replace(/-/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-white">{t.title}</h1>
      <p className="mt-1 text-sm text-zinc-400">{t.subtitle}</p>

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <h2 className="text-sm font-semibold text-violet-300">{t.identity}</h2>
        <p className="mt-1 text-xs text-zinc-500">{t.identityDesc}</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-zinc-500">{t.workspaceName}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-violet-600"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">{t.discordUrl}</label>
            <input
              value={discordUrl}
              onChange={(e) => setDiscordUrl(e.target.value)}
              placeholder={t.discordUrlPlaceholder}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-violet-600"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs text-zinc-500">{t.workspaceId}</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              readOnly
              value={session.serverId.replace(/-/g, "")}
              className="flex-1 rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2 font-mono text-sm text-zinc-500 outline-none"
            />
            <button
              onClick={handleCopyId}
              className="shrink-0 rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-600"
            >
              {copied ? t.copied : t.copy}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <h2 className="text-sm font-semibold text-violet-300">{t.access}</h2>
        <div className="mt-3 flex items-center justify-between gap-4 rounded-lg border border-zinc-800 px-3 py-2.5">
          <div>
            <div className="text-sm font-medium text-zinc-200">{t.showAllScans}</div>
            <div className="text-xs text-zinc-500">{t.showAllScansDesc}</div>
          </div>
          <button
            onClick={() => setShowAllScans((v) => !v)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${showAllScans ? "bg-violet-600" : "bg-zinc-700"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${showAllScans ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <h2 className="text-sm font-semibold text-violet-300">{t.branding}</h2>
        <p className="mt-1 text-xs text-zinc-500">{t.brandingDesc}</p>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-700">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-full w-full rounded-lg object-cover" />
            ) : (
              <ImagePlaceholderIcon className="h-6 w-6" />
            )}
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-500">{t.logoUrl}</label>
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder={t.logoUrlPlaceholder}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-violet-600"
            />
            <p className="mt-1 text-xs text-zinc-600">{t.logoUrlNote}</p>
          </div>
        </div>
      </section>

      <button
        onClick={handleSave}
        disabled={saveState === "saving"}
        className="mt-6 rounded-md bg-violet-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
      >
        {saveState === "saving" ? t.saving : saveState === "saved" ? t.saved : t.save}
      </button>
    </div>
  );
}

function ImagePlaceholderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
