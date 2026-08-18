"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ApiError,
  deleteSavedDesign,
  getScannerTheme,
  listSavedDesigns,
  publishDesign,
  saveDesign,
  updateScannerTheme,
  type SavedToolDesignResponse,
  type ScannerTheme,
} from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useT, type Dict } from "@/lib/i18n/useT";

const DEFAULT_THEME: ScannerTheme = {
  primaryTextColor: "#F5F3FF",
  secondaryTextColor: "#A497C7",
  backgroundColor: "#0A0714",
  surfaceColor: "#1B1330",
  titleBarColor: "#0A0714",
  accentColor: "#8B5CF6",
  progressColor: "#8B5CF6",
  pinTitle: "Enter a PIN",
  pinSubtitle: "Get this from whoever asked you to run a scan.",
  stageEarlyText: "",
  stageScanningText: "",
  stageDeepText: "",
  stageDetectionText: "",
  completedTitle: "Scan complete",
  completedSubtitle: "Thanks - the results have been sent to the server admin. You can close this window.",
  logoBase64: null,
  showWatermark: true,
};

type StageKey = "pin" | "early" | "scanning" | "deep" | "detection" | "done";

const STAGES: Dict<{ key: StageKey; label: string }[]> = {
  tr: [
    { key: "pin", label: "PIN Girişi" },
    { key: "early", label: "Erken" },
    { key: "scanning", label: "Tarama" },
    { key: "deep", label: "Derin" },
    { key: "detection", label: "Tespit" },
    { key: "done", label: "Tamamlandı" },
  ],
  en: [
    { key: "pin", label: "PIN Entry" },
    { key: "early", label: "Early" },
    { key: "scanning", label: "Scanning" },
    { key: "deep", label: "Deep" },
    { key: "detection", label: "Detection" },
    { key: "done", label: "Done" },
  ],
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

type Tab = "palette" | "labels" | "branding" | "options" | "library";

const STRINGS: Dict<{
  subtitle: string;
  saving: string;
  saved: string;
  saveDesign: string;
  apiUnreachable: string;
  freePlanNotice: string;
  freePlanSaveButton: string;
  freePlanNoticeSuffix: string;
  upgradeNotSaved: string;
  upgradeToPro: string;
  loading: string;
  tabPalette: string;
  tabLabels: string;
  tabBranding: string;
  tabOptions: string;
  tabLibrary: string;
  quickActions: string;
  invert: string;
  randomize: string;
  reset: string;
}> = {
  tr: {
    subtitle: "Scanner.exe'nin renklerini, metinlerini ve markasını özelleştir — değişiklikler önizlemede anında görünür.",
    saving: "Kaydediliyor...",
    saved: "Kaydedildi",
    saveDesign: "Tasarımı Kaydet",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    freePlanNotice: "Free planda Tool Designer'ı görüntüleyip düzenleyebilirsin, ama",
    freePlanSaveButton: "Tasarımı Kaydet",
    freePlanNoticeSuffix: "'e bastığında değişiklikler kalıcı olarak saklanmaz.",
    upgradeNotSaved: "Bu değişiklikler kaydedilmedi - Tool Designer'da yapılan özelleştirmeleri saklamak için Free plan yeterli değil.",
    upgradeToPro: "PRO'ya geç →",
    loading: "Yükleniyor...",
    tabPalette: "Palet",
    tabLabels: "Etiketler",
    tabBranding: "Marka",
    tabOptions: "Seçenekler",
    tabLibrary: "Kütüphanem",
    quickActions: "Hızlı işlemler",
    invert: "⇅ Ters Çevir",
    randomize: "🎲 Rastgele",
    reset: "🗑 Sıfırla",
  },
  en: {
    subtitle: "Customize Scanner.exe's colors, text, and branding — changes appear instantly in the preview.",
    saving: "Saving...",
    saved: "Saved",
    saveDesign: "Save Design",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    freePlanNotice: "On the Free plan you can view and edit Tool Designer, but pressing",
    freePlanSaveButton: "Save Design",
    freePlanNoticeSuffix: "won't persist your changes.",
    upgradeNotSaved: "These changes weren't saved - the Free plan isn't enough to persist Tool Designer customizations.",
    upgradeToPro: "Upgrade to PRO →",
    loading: "Loading...",
    tabPalette: "Palette",
    tabLabels: "Labels",
    tabBranding: "Branding",
    tabOptions: "Options",
    tabLibrary: "My Library",
    quickActions: "Quick actions",
    invert: "⇅ Invert",
    randomize: "🎲 Randomize",
    reset: "🗑 Reset",
  },
};

export default function ToolDesignerPage() {
  const router = useRouter();
  const { session, server, loading } = useServerContext();
  const { locale } = useLocale();
  const t = useT(STRINGS);
  const stages = useT(STAGES);
  const [theme, setTheme] = useState<ScannerTheme | null>(null);
  const [tab, setTab] = useState<Tab>("palette");
  const [previewStage, setPreviewStage] = useState<StageKey>("pin");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradePrompt, setUpgradePrompt] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/setup");
      return;
    }
    getScannerTheme(session.apiKey, session.serverId)
      .then(setTheme)
      .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
  }, [session, loading, router, t.apiUnreachable]);

  function patch(update: Partial<ScannerTheme>) {
    setTheme((t) => (t ? { ...t, ...update } : t));
  }

  async function handleSave() {
    if (!session || !theme) return;
    setSaving(true);
    setError(null);
    setUpgradePrompt(false);
    try {
      const updated = await updateScannerTheme(session.apiKey, session.serverId, theme);
      setTheme(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      // 402 is the API's own gate (Free plan can view/edit here, just not persist it) - the
      // dashboard's own plan check is only for showing this nicer prompt instead of a raw
      // error, the server is what actually enforces it.
      if (err instanceof ApiError && err.status === 402) {
        setUpgradePrompt(true);
      } else {
        setError(err instanceof ApiError ? err.message : t.apiUnreachable);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setTheme(DEFAULT_THEME);
  }

  function handleInvert() {
    if (!theme) return;
    patch({
      backgroundColor: theme.primaryTextColor,
      primaryTextColor: theme.backgroundColor,
      surfaceColor: theme.secondaryTextColor,
      titleBarColor: theme.backgroundColor === theme.titleBarColor ? theme.primaryTextColor : theme.titleBarColor,
    });
  }

  function handleRandomize() {
    const hue = Math.floor(Math.random() * 360);
    const accent = hslToHex(hue, 70, 60);
    patch({
      accentColor: accent,
      progressColor: accent,
      backgroundColor: hslToHex(hue, 35, 6),
      surfaceColor: hslToHex(hue, 30, 12),
      titleBarColor: hslToHex(hue, 35, 6),
      primaryTextColor: "#F5F3FF",
      secondaryTextColor: hslToHex(hue, 20, 70),
    });
  }

  if (loading || !session) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Tool Designer</h1>
          <p className="mt-1 text-sm text-zinc-400">{t.subtitle}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !theme}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? t.saving : saved ? t.saved : t.saveDesign}
        </button>
      </div>

      {server?.plan === "Free" && !upgradePrompt && (
        <p className="mt-4 rounded-md border border-violet-900/50 bg-violet-950/20 px-3 py-2 text-sm text-violet-300">
          {t.freePlanNotice} <strong>{t.freePlanSaveButton}</strong>
          {t.freePlanNoticeSuffix}
        </p>
      )}

      {upgradePrompt && (
        <div className="mt-4 rounded-md border border-amber-800/60 bg-amber-950/20 px-3 py-2.5 text-sm text-amber-200">
          <p>{t.upgradeNotSaved}</p>
          <Link href="/pricing" className="mt-2 inline-block font-medium text-amber-300 underline underline-offset-2 hover:text-amber-200">
            {t.upgradeToPro}
          </Link>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {!theme ? (
        <p className="mt-8 text-sm text-zinc-500">{t.loading}</p>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800">
            <ScannerPreview theme={theme} stage={previewStage} />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {stages.map((s) => (
              <button
                key={s.key}
                onClick={() => setPreviewStage(s.key)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  previewStage === s.key
                    ? "border-violet-600 bg-violet-950/30 text-white"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="mt-6 flex gap-1 border-b border-zinc-800">
            <TabButton active={tab === "palette"} onClick={() => setTab("palette")} label={t.tabPalette} />
            <TabButton active={tab === "labels"} onClick={() => setTab("labels")} label={t.tabLabels} />
            <TabButton active={tab === "branding"} onClick={() => setTab("branding")} label={t.tabBranding} />
            <TabButton active={tab === "options"} onClick={() => setTab("options")} label={t.tabOptions} />
            <TabButton active={tab === "library"} onClick={() => setTab("library")} label={t.tabLibrary} />
          </div>

          <div className="mt-6">
            {tab === "palette" && <PaletteTab theme={theme} onChange={patch} locale={locale} />}
            {tab === "labels" && <LabelsTab theme={theme} onChange={patch} locale={locale} />}
            {tab === "branding" && <BrandingTab theme={theme} onChange={patch} locale={locale} />}
            {tab === "options" && <OptionsTab theme={theme} onChange={patch} locale={locale} />}
            {tab === "library" && <LibraryTab theme={theme} onApply={setTheme} locale={locale} />}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-zinc-900 pt-4 text-xs text-zinc-600">
            <span>{t.quickActions}</span>
            <div className="flex gap-2">
              <button onClick={handleInvert} className="rounded-md border border-zinc-800 px-3 py-1.5 text-zinc-300 hover:border-zinc-700">
                {t.invert}
              </button>
              <button onClick={handleRandomize} className="rounded-md border border-zinc-800 px-3 py-1.5 text-zinc-300 hover:border-zinc-700">
                {t.randomize}
              </button>
              <button onClick={handleReset} className="rounded-md border border-red-900 px-3 py-1.5 text-red-400 hover:border-red-800">
                {t.reset}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
        active ? "border-violet-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

const COLOR_FIELDS: Dict<{ key: keyof ScannerTheme; label: string; desc: string }[]> = {
  tr: [
    { key: "primaryTextColor", label: "Ana Metin", desc: "Ana metin rengi" },
    { key: "secondaryTextColor", label: "İkincil Metin", desc: "İpuçları ve alt başlıklar" },
    { key: "backgroundColor", label: "Arka Plan", desc: "Ana arka plan" },
    { key: "surfaceColor", label: "Yüzey", desc: "Kart yüzeyleri" },
    { key: "titleBarColor", label: "Başlık Çubuğu", desc: "Pencere başlık çubuğu" },
    { key: "accentColor", label: "Vurgu", desc: "Odak ve vurgular" },
    { key: "progressColor", label: "İlerleme", desc: "İlerleme göstergesi" },
  ],
  en: [
    { key: "primaryTextColor", label: "Primary Text", desc: "Main text color" },
    { key: "secondaryTextColor", label: "Secondary Text", desc: "Hints and subtitles" },
    { key: "backgroundColor", label: "Background", desc: "Main background" },
    { key: "surfaceColor", label: "Surface", desc: "Card surfaces" },
    { key: "titleBarColor", label: "Title Bar", desc: "Window title bar" },
    { key: "accentColor", label: "Accent", desc: "Focus and highlights" },
    { key: "progressColor", label: "Progress", desc: "Progress indicator" },
  ],
};

function PaletteTab({
  theme,
  onChange,
  locale,
}: {
  theme: ScannerTheme;
  onChange: (u: Partial<ScannerTheme>) => void;
  locale: "tr" | "en";
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {COLOR_FIELDS[locale].map((f) => (
        <div key={f.key} className="flex items-center gap-3 rounded-lg border border-zinc-800 p-3">
          <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-zinc-700" style={{ backgroundColor: theme[f.key] as string }}>
            <input
              type="color"
              value={theme[f.key] as string}
              onChange={(e) => onChange({ [f.key]: e.target.value } as Partial<ScannerTheme>)}
              className="absolute -left-2 -top-2 h-14 w-14 cursor-pointer opacity-0"
            />
          </label>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-zinc-200">{f.label}</div>
            <input
              value={theme[f.key] as string}
              onChange={(e) => onChange({ [f.key]: e.target.value } as Partial<ScannerTheme>)}
              className="w-full bg-transparent font-mono text-xs text-zinc-500 outline-none focus:text-zinc-300"
            />
            <div className="text-[11px] text-zinc-600">{f.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const LABEL_FIELDS: Dict<{ key: keyof ScannerTheme; label: string; hint?: string; placeholder: string }[]> = {
  tr: [
    { key: "pinTitle", label: "PIN İstemi", placeholder: "Enter a PIN" },
    { key: "pinSubtitle", label: "PIN Alt Başlığı", placeholder: "Get this from whoever asked you to run a scan." },
    { key: "stageEarlyText", label: "Erken Aşama", placeholder: "(varsayılan: gerçek adım metni)" },
    { key: "stageScanningText", label: "Tarama Aşaması", placeholder: "(varsayılan: gerçek adım metni)" },
    { key: "stageDeepText", label: "Derin Tarama", placeholder: "(varsayılan: gerçek adım metni)" },
    { key: "stageDetectionText", label: "Tespit Aşaması", hint: "%c = geçerli, %t = toplam", placeholder: "(varsayılan: gerçek adım metni)" },
    { key: "completedTitle", label: "Tamamlandı", placeholder: "Scan complete" },
    { key: "completedSubtitle", label: "Tamamlandı Alt Başlığı", placeholder: "Thanks - the results have been sent..." },
  ],
  en: [
    { key: "pinTitle", label: "PIN Prompt", placeholder: "Enter a PIN" },
    { key: "pinSubtitle", label: "PIN Subtitle", placeholder: "Get this from whoever asked you to run a scan." },
    { key: "stageEarlyText", label: "Early Stage", placeholder: "(default: actual step text)" },
    { key: "stageScanningText", label: "Scanning Stage", placeholder: "(default: actual step text)" },
    { key: "stageDeepText", label: "Deep Scan", placeholder: "(default: actual step text)" },
    { key: "stageDetectionText", label: "Detection Stage", hint: "%c = current, %t = total", placeholder: "(default: actual step text)" },
    { key: "completedTitle", label: "Completed", placeholder: "Scan complete" },
    { key: "completedSubtitle", label: "Completed Subtitle", placeholder: "Thanks - the results have been sent..." },
  ],
};

function LabelsTab({
  theme,
  onChange,
  locale,
}: {
  theme: ScannerTheme;
  onChange: (u: Partial<ScannerTheme>) => void;
  locale: "tr" | "en";
}) {
  const fields = LABEL_FIELDS[locale];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key}>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-300">{f.label}</label>
            {f.hint && (
              <span className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
                {f.hint}
              </span>
            )}
          </div>
          <input
            value={(theme[f.key] as string) ?? ""}
            onChange={(e) => onChange({ [f.key]: e.target.value } as Partial<ScannerTheme>)}
            placeholder={f.placeholder}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
          />
        </div>
      ))}
    </div>
  );
}

const BRANDING_STRINGS: Dict<{
  scannerLogo: string;
  clickToUpload: string;
  hint: string;
  fileTooLarge: string;
  invalidFileType: string;
  removeLogo: string;
}> = {
  tr: {
    scannerLogo: "Tarayıcı Logosu",
    clickToUpload: "Logo yüklemek için tıkla",
    hint: "Önerilen 600×300px · En fazla 2MB · PNG/SVG tercih edilir",
    fileTooLarge: "Dosya çok büyük (maksimum 2MB).",
    invalidFileType: "Sadece PNG, JPEG ya da SVG kabul edilir.",
    removeLogo: "Özel logoyu kaldır",
  },
  en: {
    scannerLogo: "Scanner Logo",
    clickToUpload: "Click to upload a logo",
    hint: "Recommended 600×300px · Max 2MB · PNG/SVG preferred",
    fileTooLarge: "File is too large (max 2MB).",
    invalidFileType: "Only PNG, JPEG, or SVG are accepted.",
    removeLogo: "Remove custom logo",
  },
};

function BrandingTab({
  theme,
  onChange,
  locale,
}: {
  theme: ScannerTheme;
  onChange: (u: Partial<ScannerTheme>) => void;
  locale: "tr" | "en";
}) {
  const t = BRANDING_STRINGS[locale];
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setError(t.fileTooLarge);
      return;
    }
    if (!["image/png", "image/svg+xml", "image/jpeg"].includes(file.type)) {
      setError(t.invalidFileType);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange({ logoBase64: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <div className="text-sm font-medium text-zinc-300">{t.scannerLogo}</div>
      <label className="mt-2 flex h-40 w-full max-w-md cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 transition-colors hover:border-violet-700">
        {theme.logoBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={theme.logoBase64} alt="" className="max-h-28 max-w-[80%] object-contain" />
        ) : (
          <span className="text-xs text-zinc-500">{t.clickToUpload}</span>
        )}
        <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </label>
      <p className="mt-2 text-xs text-zinc-600">{t.hint}</p>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

      {theme.logoBase64 && (
        <button
          onClick={() => onChange({ logoBase64: null })}
          className="mt-3 rounded-md border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:border-red-800"
        >
          {t.removeLogo}
        </button>
      )}
    </div>
  );
}

function OptionsTab({
  theme,
  onChange,
  locale,
}: {
  theme: ScannerTheme;
  onChange: (u: Partial<ScannerTheme>) => void;
  locale: "tr" | "en";
}) {
  const t =
    locale === "en"
      ? { showWatermark: "Show Watermark", desc: 'Show "NexusGuard" text in the bottom corner of the tool window.' }
      : { showWatermark: "Filigran Göster", desc: 'Araç penceresinin alt köşesinde "NexusGuard" metnini göster.' };
  return (
    <div className="max-w-md rounded-lg border border-zinc-800 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-zinc-200">{t.showWatermark}</div>
          <p className="mt-1 text-xs text-zinc-500">{t.desc}</p>
        </div>
        <button
          onClick={() => onChange({ showWatermark: !theme.showWatermark })}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${theme.showWatermark ? "bg-violet-600" : "bg-zinc-700"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              theme.showWatermark ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

const LIBRARY_STRINGS: Dict<{
  apiUnreachable: string;
  namePrompt: string;
  nameDefault: string;
  titlePrompt: string;
  descPrompt: string;
  uploadedAlert: string;
  savedDesigns: string;
  subtitle: string;
  marketplace: string;
  subtitleSuffix: string;
  saving: string;
  saveCurrent: string;
  loading: string;
  noDesignsYet: string;
  apply: string;
  publishToMarketplace: string;
  delete: string;
}> = {
  tr: {
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    namePrompt: "Bu tasarıma bir isim ver:",
    nameDefault: "Tasarımım",
    titlePrompt: "Mağazada görünecek başlık:",
    descPrompt: "Kısa bir açıklama (isteğe bağlı):",
    uploadedAlert: "Tasarım Mağaza'ya yüklendi.",
    savedDesigns: "Kayıtlı Tasarımlarım",
    subtitle: "Şu anki tasarımı adlandırıp kaydet, sonra istediğin zaman geri yükle ya da",
    marketplace: "Mağaza",
    subtitleSuffix: "'ya yükle.",
    saving: "Kaydediliyor...",
    saveCurrent: "Şu anki tasarımı kaydet",
    loading: "Yükleniyor...",
    noDesignsYet: "Henüz kayıtlı bir tasarımın yok.",
    apply: "Uygula",
    publishToMarketplace: "Pazara Yükle",
    delete: "Sil",
  },
  en: {
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    namePrompt: "Name this design:",
    nameDefault: "My Design",
    titlePrompt: "Title to show in the Marketplace:",
    descPrompt: "A short description (optional):",
    uploadedAlert: "Design uploaded to the Marketplace.",
    savedDesigns: "My Saved Designs",
    subtitle: "Name and save the current design, then restore it anytime, or upload it to the",
    marketplace: "Marketplace",
    subtitleSuffix: ".",
    saving: "Saving...",
    saveCurrent: "Save current design",
    loading: "Loading...",
    noDesignsYet: "You don't have any saved designs yet.",
    apply: "Apply",
    publishToMarketplace: "Publish to Marketplace",
    delete: "Delete",
  },
};

function LibraryTab({
  theme,
  onApply,
  locale,
}: {
  theme: ScannerTheme;
  onApply: (t: ScannerTheme) => void;
  locale: "tr" | "en";
}) {
  const t = LIBRARY_STRINGS[locale];
  const [designs, setDesigns] = useState<SavedToolDesignResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  function load() {
    listSavedDesigns()
      .then(setDesigns)
      .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  async function handleSave() {
    const name = window.prompt(t.namePrompt, t.nameDefault);
    if (!name || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await saveDesign(name.trim(), theme);
      setDesigns((prev) => (prev ? [created, ...prev] : [created]));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteSavedDesign(id);
      setDesigns((prev) => prev?.filter((d) => d.id !== id) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
    }
  }

  async function handlePublish(design: SavedToolDesignResponse) {
    const title = window.prompt(t.titlePrompt, design.name);
    if (!title || !title.trim()) return;
    const description = window.prompt(t.descPrompt, "") ?? "";

    setPublishingId(design.id);
    setError(null);
    try {
      await publishDesign(design.id, title.trim(), description.trim() || null);
      window.alert(t.uploadedAlert);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-zinc-300">{t.savedDesigns}</div>
          <p className="mt-1 text-xs text-zinc-500">
            {t.subtitle}{" "}
            <Link href="/marketplace" className="text-violet-400 hover:text-violet-300">
              {t.marketplace}
            </Link>
            {t.subtitleSuffix}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {saving ? t.saving : t.saveCurrent}
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      {designs === null && <p className="mt-6 text-sm text-zinc-500">{t.loading}</p>}

      {designs !== null && designs.length === 0 && (
        <p className="mt-6 rounded-lg border border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
          {t.noDesignsYet}
        </p>
      )}

      {designs !== null && designs.length > 0 && (
        <div className="mt-4 space-y-2">
          {designs.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3">
              <div className="flex items-center gap-3">
                <span
                  className="h-8 w-8 shrink-0 rounded-md border border-zinc-700"
                  style={{ backgroundColor: d.theme.accentColor }}
                />
                <div>
                  <div className="text-sm font-medium text-zinc-200">{d.name}</div>
                  <div className="text-[11px] text-zinc-600">
                    {new Date(d.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onApply(d.theme)}
                  className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-violet-700 hover:text-violet-300"
                >
                  {t.apply}
                </button>
                <button
                  onClick={() => handlePublish(d)}
                  disabled={publishingId === d.id}
                  className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-violet-700 hover:text-violet-300 disabled:opacity-50"
                >
                  {publishingId === d.id ? "..." : t.publishToMarketplace}
                </button>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-red-800 hover:text-red-400"
                >
                  {t.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScannerPreview({ theme, stage }: { theme: ScannerTheme; stage: StageKey }) {
  const stageText: Record<Exclude<StageKey, "pin" | "done">, string> = {
    early: theme.stageEarlyText || "Collecting system information...",
    scanning: theme.stageScanningText || "Scanning processes and files...",
    deep: theme.stageDeepText || "Checking FiveM and Windows directories...",
    detection: theme.stageDetectionText || "Analyzing findings...",
  };
  const progressByStage: Record<StageKey, number> = { pin: 0, early: 10, scanning: 35, deep: 60, detection: 85, done: 100 };

  return (
    <div className="relative flex h-72 flex-col items-center p-6" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
        <div className="flex shrink-0 flex-col items-center gap-2">
          {theme.logoBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={theme.logoBase64} alt="Logo" className="h-14 w-14 object-contain" />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold text-white"
              style={{ backgroundColor: theme.accentColor }}
            >
              NG
            </div>
          )}
          <span className="text-sm font-semibold" style={{ color: theme.primaryTextColor }}>
            NexusGuard
          </span>
        </div>

        <div className="flex w-full flex-col items-center text-center">
          {stage === "pin" && (
            <>
              <div className="text-lg font-semibold" style={{ color: theme.primaryTextColor }}>
                {theme.pinTitle || "Enter a PIN"}
              </div>
              <div className="mt-1 text-xs" style={{ color: theme.secondaryTextColor }}>
                {theme.pinSubtitle}
              </div>
              <div className="mt-4 flex gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex h-11 w-9 items-center justify-center rounded-md border text-sm font-semibold"
                    style={{ borderColor: theme.accentColor, backgroundColor: theme.surfaceColor, color: theme.primaryTextColor }}
                  >
                    {i === 0 ? "•" : ""}
                  </div>
                ))}
              </div>
            </>
          )}

          {stage !== "pin" && stage !== "done" && (
            <>
              <div className="text-lg font-semibold" style={{ color: theme.primaryTextColor }}>
                Scanning your PC
              </div>
              <div className="mt-1 text-xs" style={{ color: theme.secondaryTextColor }}>
                {stageText[stage]}
              </div>
              <div className="mt-4 h-2.5 w-full max-w-md overflow-hidden rounded-full" style={{ backgroundColor: theme.surfaceColor }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progressByStage[stage]}%`, backgroundColor: theme.progressColor }}
                />
              </div>
            </>
          )}

          {stage === "done" && (
            <>
              <div className="text-lg font-semibold" style={{ color: theme.primaryTextColor }}>
                {theme.completedTitle || "Scan complete"}
              </div>
              <div className="mt-1 max-w-sm text-xs" style={{ color: theme.secondaryTextColor }}>
                {theme.completedSubtitle}
              </div>
            </>
          )}
        </div>
      </div>

      {theme.showWatermark && (
        <div className="absolute bottom-3 right-4 text-[10px]" style={{ color: theme.secondaryTextColor }}>
          NexusGuard
        </div>
      )}
    </div>
  );
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
