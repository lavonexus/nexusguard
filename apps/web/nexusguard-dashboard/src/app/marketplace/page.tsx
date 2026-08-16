"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ApiError,
  getMarketplaceListing,
  installListing,
  listMarketplaceListings,
  listMyListings,
  submitReview,
  type MarketplaceListingDetailResponse,
  type MarketplaceListingSummaryResponse,
} from "@/lib/api";
import { useServerContext } from "@/lib/serverContext";
import { useLocale, type Locale } from "@/lib/i18n/LocaleContext";
import { useT, type Dict } from "@/lib/i18n/useT";

type Tab = "explore" | "mine";

const STRINGS: Dict<{
  title: string;
  subtitle: string;
  explore: string;
  mySubmissions: string;
  searchPlaceholder: string;
  search: string;
  apiUnreachable: string;
  loading: string;
  noListingsYet: string;
  noSubmissionsYet: string;
  noSubmissionsHint: string;
  installs: string;
  by: string;
  backToMarketplace: string;
  reviews: string;
  installsCount: string;
  install: string;
  freePlanNotEnough: string;
  upgradeToPro: string;
  confirmInstallPrefix: string;
  confirmInstallMiddle: string;
  confirmInstallSuffix: string;
  installing: string;
  yesInstall: string;
  cancel: string;
  leaveReview: string;
  shareExperience: string;
  submitting: string;
  submit: string;
  pickStarFirst: string;
  noReviewsYet: string;
  enterAPin: string;
  reviewsHeading: string;
}> = {
  tr: {
    title: "Mağaza",
    subtitle: "Topluluğun oluşturduğu Tool Designer tasarımlarını keşfet ve yükle.",
    explore: "Keşfet",
    mySubmissions: "Gönderimlerim",
    searchPlaceholder: "Mağazada ara...",
    search: "Ara",
    apiUnreachable: "NexusGuard API'ye ulaşılamadı.",
    loading: "Yükleniyor...",
    noListingsYet: "Henüz paylaşılan bir tasarım yok.",
    noSubmissionsYet: "Henüz bir tasarım paylaşmadın.",
    noSubmissionsHint: "'daki Kütüphanem sekmesinden bir tasarımı Mağaza'ya yükleyebilirsin.",
    installs: "yükleme",
    by: "tarafından",
    backToMarketplace: "← Mağaza'ya dön",
    reviews: "değerlendirme",
    installsCount: "yükleme",
    install: "Yükle",
    freePlanNotEnough: "Mağazadan tasarım yüklemek için Free plan yeterli değil.",
    upgradeToPro: "PRO'ya geç →",
    confirmInstallPrefix: "Bu,",
    confirmInstallMiddle: "sunucundaki Tool Designer tasarımını",
    confirmInstallSuffix: "ile değiştirecek. Mevcut özelleştirmen kaybolur — emin misin?",
    installing: "Yükleniyor...",
    yesInstall: "Evet, yükle",
    cancel: "Vazgeç",
    leaveReview: "Bir değerlendirme bırak",
    shareExperience: "Deneyimini paylaş (isteğe bağlı)...",
    submitting: "Gönderiliyor...",
    submit: "Gönder",
    pickStarFirst: "Önce bir yıldız seç.",
    noReviewsYet: "Henüz değerlendirme yok — ilk sen ol.",
    enterAPin: "Enter a PIN",
    reviewsHeading: "Değerlendirmeler",
  },
  en: {
    title: "Marketplace",
    subtitle: "Discover and install Tool Designer themes created by the community.",
    explore: "Explore",
    mySubmissions: "My Submissions",
    searchPlaceholder: "Search the marketplace...",
    search: "Search",
    apiUnreachable: "Couldn't reach the NexusGuard API.",
    loading: "Loading...",
    noListingsYet: "No designs have been shared yet.",
    noSubmissionsYet: "You haven't shared a design yet.",
    noSubmissionsHint: "'s My Library tab, you can upload a design to the Marketplace.",
    installs: "installs",
    by: "by",
    backToMarketplace: "← Back to Marketplace",
    reviews: "reviews",
    installsCount: "installs",
    install: "Install",
    freePlanNotEnough: "The Free plan isn't enough to install a design from the Marketplace.",
    upgradeToPro: "Upgrade to PRO →",
    confirmInstallPrefix: "This will replace the Tool Designer theme on",
    confirmInstallMiddle: "with",
    confirmInstallSuffix: "- your current customization will be lost. Are you sure?",
    installing: "Installing...",
    yesInstall: "Yes, install",
    cancel: "Cancel",
    leaveReview: "Leave a review",
    shareExperience: "Share your experience (optional)...",
    submitting: "Submitting...",
    submit: "Submit",
    pickStarFirst: "Pick a star rating first.",
    noReviewsYet: "No reviews yet — be the first.",
    enterAPin: "Enter a PIN",
    reviewsHeading: "Reviews",
  },
};

export default function MarketplacePage() {
  const router = useRouter();
  const { session, server, loading } = useServerContext();
  const t = useT(STRINGS);
  const [tab, setTab] = useState<Tab>("explore");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/setup");
  }, [session, loading, router]);

  if (loading || !session) return null;

  if (selectedId) {
    return (
      <ListingDetail
        id={selectedId}
        server={server}
        t={t}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
        <span className="text-violet-400">🛍</span> {t.title}
      </h1>
      <p className="mt-1 text-sm text-zinc-400">{t.subtitle}</p>

      <div className="mt-6 flex gap-1 border-b border-zinc-800">
        <TabButton active={tab === "explore"} onClick={() => setTab("explore")} label={t.explore} />
        <TabButton active={tab === "mine"} onClick={() => setTab("mine")} label={t.mySubmissions} />
      </div>

      {tab === "explore" && <ExploreTab t={t} onSelect={setSelectedId} />}
      {tab === "mine" && <MineTab t={t} onSelect={setSelectedId} />}
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

function ExploreTab({ t, onSelect }: { t: (typeof STRINGS)["tr"]; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<MarketplaceListingSummaryResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load(q?: string) {
    listMarketplaceListings(q)
      .then(setListings)
      .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(), []);

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
          placeholder={t.searchPlaceholder}
          className="w-full max-w-sm rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
        />
        <button type="submit" className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600">
          {t.search}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {listings === null && !error && <p className="mt-6 text-sm text-zinc-500">{t.loading}</p>}
      {listings !== null && listings.length === 0 && (
        <p className="mt-6 rounded-lg border border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
          {t.noListingsYet}
        </p>
      )}

      {listings !== null && listings.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} t={t} onClick={() => onSelect(l.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MineTab({ t, onSelect }: { t: (typeof STRINGS)["tr"]; onSelect: (id: string) => void }) {
  const [listings, setListings] = useState<MarketplaceListingSummaryResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyListings()
      .then(setListings)
      .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
  }, [t.apiUnreachable]);

  return (
    <div className="mt-6">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {listings === null && !error && <p className="text-sm text-zinc-500">{t.loading}</p>}
      {listings !== null && listings.length === 0 && (
        <div className="rounded-lg border border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
          <p>{t.noSubmissionsYet}</p>
          <p className="mt-2 text-xs text-zinc-600">
            <Link href="/tool-designer" className="text-violet-400 hover:text-violet-300">
              Tool Designer
            </Link>
            {t.noSubmissionsHint}
          </p>
        </div>
      )}
      {listings !== null && listings.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} t={t} onClick={() => onSelect(l.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListingCard({
  listing,
  t,
  onClick,
}: {
  listing: MarketplaceListingSummaryResponse;
  t: (typeof STRINGS)["tr"];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 text-left transition-colors hover:border-zinc-700"
    >
      <div className="flex h-24 items-center justify-center" style={{ backgroundColor: listing.backgroundColor }}>
        {listing.logoBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.logoBase64} alt="" className="h-12 w-12 object-contain" />
        ) : (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: listing.accentColor }}
          >
            NG
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="truncate text-sm font-semibold text-white">{listing.title}</div>
        {listing.description && <div className="mt-0.5 truncate text-xs text-zinc-500">{listing.description}</div>}
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
          <StarRating value={listing.averageRating} size="sm" />
          <span>
            {listing.installCount} {t.installs}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-zinc-600">
          {listing.authorUsername} {t.by}
        </div>
      </div>
    </button>
  );
}

function ListingDetail({
  id,
  server,
  t,
  onBack,
}: {
  id: string;
  server: { id: string; name: string; plan: string } | null;
  t: (typeof STRINGS)["tr"];
  onBack: () => void;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [detail, setDetail] = useState<MarketplaceListingDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingInstall, setConfirmingInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [upgradePrompt, setUpgradePrompt] = useState(false);

  function load() {
    getMarketplaceListing(id)
      .then(setDetail)
      .catch((err) => setError(err instanceof ApiError ? err.message : t.apiUnreachable));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id]);

  function handleInstallClick() {
    if (server?.plan === "Free") {
      setUpgradePrompt(true);
      return;
    }
    setUpgradePrompt(false);
    setConfirmingInstall(true);
  }

  async function handleConfirmInstall() {
    if (!server) return;
    setInstalling(true);
    setInstallError(null);
    try {
      await installListing(id, server.id);
      router.push("/tool-designer");
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setConfirmingInstall(false);
        setUpgradePrompt(true);
      } else {
        setInstallError(err instanceof ApiError ? err.message : t.apiUnreachable);
      }
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div>
      <button onClick={onBack} className="text-sm text-zinc-400 hover:text-zinc-200">
        {t.backToMarketplace}
      </button>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {!detail && !error && <p className="mt-6 text-sm text-zinc-500">{t.loading}</p>}

      {detail && (
        <>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-white">{detail.summary.title}</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
                <StarRating value={detail.summary.averageRating} />
                <span className="text-zinc-600">
                  ({detail.summary.reviewCount} {t.reviews} · {detail.summary.installCount} {t.installsCount})
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {detail.summary.authorUsername} {t.by}
              </p>
            </div>
            <button
              onClick={handleInstallClick}
              className="shrink-0 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              {t.install}
            </button>
          </div>

          {detail.summary.description && <p className="mt-4 text-sm text-zinc-300">{detail.summary.description}</p>}

          {upgradePrompt && (
            <div className="mt-4 rounded-md border border-amber-800/60 bg-amber-950/20 px-3 py-2.5 text-sm text-amber-200">
              <p>{t.freePlanNotEnough}</p>
              <Link href="/pricing" className="mt-2 inline-block font-medium text-amber-300 underline underline-offset-2 hover:text-amber-200">
                {t.upgradeToPro}
              </Link>
            </div>
          )}

          {confirmingInstall && (
            <div className="mt-4 rounded-lg border border-violet-800/60 bg-violet-950/20 p-4">
              <p className="text-sm text-zinc-200">
                {t.confirmInstallPrefix} <strong>{server?.name}</strong> {t.confirmInstallMiddle}{" "}
                <strong>{detail.summary.title}</strong> {t.confirmInstallSuffix}
              </p>
              {installError && <p className="mt-2 text-xs text-red-400">{installError}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleConfirmInstall}
                  disabled={installing}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {installing ? t.installing : t.yesInstall}
                </button>
                <button
                  onClick={() => setConfirmingInstall(false)}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-600"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800">
            <div className="flex h-40 items-center justify-center gap-4 p-6" style={{ backgroundColor: detail.theme.backgroundColor }}>
              {detail.theme.logoBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detail.theme.logoBase64} alt="" className="h-16 w-16 object-contain" />
              ) : (
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-xl text-xl font-bold text-white"
                  style={{ backgroundColor: detail.theme.accentColor }}
                >
                  NG
                </div>
              )}
              <div>
                <div className="text-lg font-semibold" style={{ color: detail.theme.primaryTextColor }}>
                  {detail.theme.pinTitle || t.enterAPin}
                </div>
                <div className="text-xs" style={{ color: detail.theme.secondaryTextColor }}>
                  {detail.theme.pinSubtitle}
                </div>
              </div>
            </div>
          </div>

          <ReviewSection listingId={id} reviews={detail.reviews} t={t} locale={locale} onSubmitted={load} />
        </>
      )}
    </div>
  );
}

function ReviewSection({
  listingId,
  reviews,
  t,
  locale,
  onSubmitted,
}: {
  listingId: string;
  reviews: MarketplaceListingDetailResponse["reviews"];
  t: (typeof STRINGS)["tr"];
  locale: Locale;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (rating < 1) {
      setError(t.pickStarFirst);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitReview(listingId, rating, comment.trim() || null);
      setComment("");
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.apiUnreachable);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="rounded-lg border border-zinc-800 p-4">
        <div className="text-sm font-medium text-zinc-200">{t.leaveReview}</div>
        <div className="mt-2">
          <StarRating value={rating} onChange={setRating} />
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t.shareExperience}
          rows={3}
          className="mt-3 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
        />
        <div className="mt-2 flex items-center justify-between">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="ml-auto rounded-md bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {submitting ? t.submitting : t.submit}
          </button>
        </div>
      </div>

      <h2 className="mt-6 text-sm font-semibold text-zinc-300">
        {t.reviewsHeading} ({reviews.length})
      </h2>

      {reviews.length === 0 ? (
        <p className="mt-3 rounded-lg border border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
          {t.noReviewsYet}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-lg border border-zinc-800 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-200">{r.reviewerUsername}</span>
                <StarRating value={r.rating} size="sm" />
              </div>
              {r.comment && <p className="mt-1.5 text-sm text-zinc-400">{r.comment}</p>}
              <p className="mt-1.5 text-[11px] text-zinc-600">
                {new Date(r.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StarRating({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md";
}) {
  const interactive = !!onChange;
  const starClass = size === "sm" ? "text-sm" : "text-lg";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={interactive ? () => onChange!(n) : undefined}
          className={`${starClass} ${interactive ? "cursor-pointer" : ""} ${
            n <= Math.round(value) ? "text-amber-400" : "text-zinc-700"
          }`}
        >
          ★
        </span>
      ))}
    </div>
  );
}
