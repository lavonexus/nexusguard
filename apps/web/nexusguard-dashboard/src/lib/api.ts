const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    // Always ride along with the dashboard session cookie, even on API-key calls - the API
    // uses it opportunistically (e.g. to attribute a created scan to whoever is logged in
    // for the "who scans the most" leaderboard) without requiring it.
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// request() already sends the session cookie on every call now; this alias just documents
// the endpoints that rely on it as their actual authorization (not just opportunistically).
function sessionRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, options);
}

export const DISCORD_LOGIN_URL = `${API_BASE_URL}/api/auth/discord/login`;
export const GOOGLE_LOGIN_URL = `${API_BASE_URL}/api/auth/google/login`;

// There's no on-site checkout - every purchase (and every plan change) goes through a Discord
// ticket, confirmed by a human, then applied by a site admin from /admin.
export const DISCORD_PURCHASE_URL = "https://discord.gg/nexusguard";

export interface UserResponse {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  createdAt: string;
  discordLinked: boolean;
  googleLinked: boolean;
  activeSessionCount: number;
  isSiteAdmin: boolean;
}

export interface CreateServerResponse {
  id: string;
  name: string;
  apiKey: string;
}

export type Plan = "Free" | "Pro" | "ProDuo" | "Enterprise";

export interface ServerResponse {
  id: string;
  name: string;
  createdAt: string;
  isActive: boolean;
  plan: Plan;
  enterpriseSeats: number | null;
  planExpiresAt: string | null;
  needsSetup: boolean;
}

export interface ServerMemberResponse {
  id: string;
  userId: string;
  username: string;
  role: string;
  addedAt: string;
}

export interface MyServerResponse extends ServerResponse {
  role: "Owner" | "Member";
}

export interface LeaderboardEntryResponse {
  userId: string;
  username: string;
  avatarUrl: string | null;
  provider: "Discord" | "Google" | null;
  scanCount: number;
  detectionCount: number;
}

export type ScanStatus =
  | "Pending"
  | "TokenIssued"
  | "InProgress"
  | "Completed"
  | "Expired"
  | "Failed"
  | "Cancelled";

export interface ScanSessionResponse {
  id: string;
  playerIdentifier: string;
  status: ScanStatus;
  riskScore: number | null;
  aiSummary: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  // Set only when the scan was started via the Discord bot's /nexusguard-scan command - the
  // admin picked this member through Discord's own UI, never read from the player's machine.
  discordUserId: string | null;
  discordUsername: string | null;
  discordAvatarUrl: string | null;
  // Set when Scanner.exe found a currently-active Steam account (see SteamScanner) and the
  // server resolved it via Steam's public Web API.
  steamId64: string | null;
  steamUsername: string | null;
  steamAvatarUrl: string | null;
}

export interface ScanResultSummaryResponse {
  id: string;
  resultType: string;
  dataJson: string;
  createdAt: string;
}

export type DetectionCategory =
  | "CHEAT"
  | "INJECTOR"
  | "LUA"
  | "LOADER"
  | "MAPPER"
  | "SUSPICIOUS DLL"
  | "SUSPICIOUS DRIVER"
  | "CLEANER"
  | "HISTORICAL ARTIFACT"
  | "SUSPICIOUS APPLICATION"
  | "SUSPICIOUS PROCESS"
  | "OTHER"
  | string;

export type DetectionStatus = "Active" | "Historical" | "Removed" | "Unknown" | string;
export type DetectionConfidence = "Low" | "Medium" | "High" | "Confirmed" | string;

export interface DetectionResponse {
  id: string;
  ruleId: string;
  description: string;
  weight: number;
  evidence: string;
  createdAt: string;
  category: DetectionCategory;
  status: DetectionStatus;
  confidence: DetectionConfidence;
  sha256: string | null;
  publisher: string | null;
  signed: boolean | null;
  firstSeenUtc: string | null;
  lastModifiedUtc: string | null;
}

export interface ScanSessionDetailResponse {
  session: ScanSessionResponse;
  results: ScanResultSummaryResponse[];
  detections: DetectionResponse[];
}

export interface CreateScanResponse {
  scanId: string;
  pin: string;
  pinExpiresAt: string;
}

export function createUser(username: string, email: string) {
  return request<UserResponse>("/api/users", {
    method: "POST",
    body: JSON.stringify({ username, email: email || null }),
  });
}

export function createServer(name: string, ownerUserId: string) {
  return request<CreateServerResponse>("/api/servers", {
    method: "POST",
    body: JSON.stringify({ name, ownerUserId }),
  });
}

export function createServerForCurrentUser(name: string) {
  return sessionRequest<CreateServerResponse>("/api/servers", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function getServer(apiKey: string, id: string) {
  return request<ServerResponse>(`/api/servers/${id}`, {
    headers: { "X-Api-Key": apiKey },
  });
}

// Owner-only. Also clears NeedsSetup - this is the one action that marks a fresh Enterprise
// grant's onboarding screen as complete.
export function renameServer(apiKey: string, id: string, name: string) {
  return request<ServerResponse>(`/api/servers/${id}`, {
    method: "PATCH",
    headers: { "X-Api-Key": apiKey },
    body: JSON.stringify({ name }),
  });
}

// Same as renameServer, but authenticated by the dashboard session cookie instead of an API
// key - used right after login, before the browser has a locally-stored key for this server.
export function renameServerAsOwner(id: string, name: string) {
  return sessionRequest<ServerResponse>(`/api/servers/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function rotateApiKey(apiKey: string, id: string) {
  return request<{ apiKey: string }>(`/api/servers/${id}/apikey`, {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
  });
}

// Recovery path for a server whose key isn't stored in this browser: the Discord-login
// session proves ownership instead of the (lost) key.
export function rotateApiKeyAsOwner(id: string) {
  return sessionRequest<{ apiKey: string }>(`/api/servers/${id}/apikey`, {
    method: "POST",
  });
}

export function getCurrentUser() {
  return sessionRequest<UserResponse>("/api/auth/me");
}

export function updateDisplayName(displayName: string) {
  return sessionRequest<UserResponse>("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify({ displayName }),
  });
}

export function logout() {
  return sessionRequest<void>("/api/auth/logout", { method: "POST" });
}

export function listMyServers() {
  return sessionRequest<MyServerResponse[]>("/api/servers/mine");
}

// Global, cross-server - every NexusGuard user, not just your own team. Session-cookie
// authenticated (any logged-in dashboard user can see it), not tied to a specific server's
// API key.
export function getLeaderboard(period: "weekly" | "monthly") {
  return sessionRequest<LeaderboardEntryResponse[]>(`/api/leaderboard?period=${period}`);
}

export function listScans(apiKey: string) {
  return request<ScanSessionResponse[]>("/api/scans", {
    headers: { "X-Api-Key": apiKey },
  });
}

export function getScan(apiKey: string, id: string) {
  return request<ScanSessionDetailResponse>(`/api/scans/${id}`, {
    headers: { "X-Api-Key": apiKey },
  });
}

// playerIdentifier is optional - most of the time the admin doesn't know who they're
// scanning yet, so the server fills in a placeholder label when it's omitted.
export function createScan(apiKey: string, playerIdentifier?: string) {
  return request<CreateScanResponse>("/api/scans", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: JSON.stringify({ playerIdentifier: playerIdentifier || null }),
  });
}

export interface ScannerTheme {
  primaryTextColor: string;
  secondaryTextColor: string;
  backgroundColor: string;
  surfaceColor: string;
  titleBarColor: string;
  accentColor: string;
  progressColor: string;
  pinTitle: string;
  pinSubtitle: string;
  stageEarlyText: string;
  stageScanningText: string;
  stageDeepText: string;
  stageDetectionText: string;
  completedTitle: string;
  completedSubtitle: string;
  logoBase64: string | null;
  showWatermark: boolean;
}

export function getScannerTheme(apiKey: string, serverId: string) {
  return request<ScannerTheme>(`/api/servers/${serverId}/theme`, {
    headers: { "X-Api-Key": apiKey },
  });
}

export function updateScannerTheme(apiKey: string, serverId: string, theme: ScannerTheme) {
  return request<ScannerTheme>(`/api/servers/${serverId}/theme`, {
    method: "PUT",
    headers: { "X-Api-Key": apiKey },
    body: JSON.stringify(theme),
  });
}

export function listMembers(apiKey: string, serverId: string) {
  return request<ServerMemberResponse[]>(`/api/servers/${serverId}/members`, {
    headers: { "X-Api-Key": apiKey },
  });
}

export function addMember(apiKey: string, serverId: string, discordUsername: string) {
  return request<ServerMemberResponse>(`/api/servers/${serverId}/members`, {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: JSON.stringify({ discordUsername }),
  });
}

export function removeMember(apiKey: string, serverId: string, memberId: string) {
  return request<void>(`/api/servers/${serverId}/members/${memberId}`, {
    method: "DELETE",
    headers: { "X-Api-Key": apiKey },
  });
}

// --- Site admin panel (/admin) - only usable by a dashboard session whose user has
// isSiteAdmin=true; the API re-checks this on every call, a false response here is never the
// actual authorization boundary.

export interface AdminUserResponse {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  discordId: string | null;
  googleLinked: boolean;
  isSiteAdmin: boolean;
  createdAt: string;
}

export interface AdminServerResponse {
  id: string;
  name: string;
  ownerUserId: string;
  ownerUsername: string;
  plan: Plan;
  enterpriseSeats: number | null;
  planExpiresAt: string | null;
  memberCount: number;
  createdAt: string;
}

export function listAdminUsers(query?: string) {
  const qs = query ? `?query=${encodeURIComponent(query)}` : "";
  return sessionRequest<AdminUserResponse[]>(`/api/admin/users${qs}`);
}

export function setSiteAdmin(username: string, isSiteAdmin: boolean) {
  return sessionRequest<AdminUserResponse>("/api/admin/site-admins", {
    method: "POST",
    body: JSON.stringify({ username, isSiteAdmin }),
  });
}

export function listAdminServers(query?: string) {
  const qs = query ? `?query=${encodeURIComponent(query)}` : "";
  return sessionRequest<AdminServerResponse[]>(`/api/admin/servers${qs}`);
}

// durationDays: null grants an indefinite plan (only meaningful from the admin panel - there's
// no self-serve equivalent). enterpriseSeats is required when plan is "Enterprise".
export function adminSetPlan(
  serverId: string,
  plan: Plan,
  enterpriseSeats: number | null,
  durationDays: number | null
) {
  return sessionRequest<AdminServerResponse>(`/api/admin/servers/${serverId}/plan`, {
    method: "POST",
    body: JSON.stringify({ plan, enterpriseSeats, durationDays }),
  });
}

// One-click revert to Free, regardless of how much time was left on the grant - a refund,
// chargeback, or a mistake shouldn't require filling in the full plan form again.
export function adminCancelPlan(serverId: string) {
  return sessionRequest<AdminServerResponse>(`/api/admin/servers/${serverId}/cancel-plan`, {
    method: "POST",
  });
}

// Reactive safety net for the marketplace - listings/reviews publish immediately with no
// approval gate, so this is the only way to take down something inappropriate after the fact.
export function adminDeleteMarketplaceListing(id: string) {
  return sessionRequest<void>(`/api/admin/marketplace/listings/${id}`, { method: "DELETE" });
}

export function adminDeleteMarketplaceReview(id: string) {
  return sessionRequest<void>(`/api/admin/marketplace/reviews/${id}`, { method: "DELETE" });
}

// --- Tool Designer library + marketplace (Controllers/MarketplaceController.cs) -----------
// A private per-user library of saved theme snapshots, plus a public marketplace anyone can
// browse/review/install into their own Tool Designer. Theme-only (colors/text/logo/watermark)
// - never a place to share detection logic.

export interface SavedToolDesignResponse {
  id: string;
  name: string;
  theme: ScannerTheme;
  createdAt: string;
}

export interface MarketplaceListingSummaryResponse {
  id: string;
  title: string;
  description: string | null;
  authorUsername: string;
  installCount: number;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  logoBase64: string | null;
}

export interface MarketplaceListingDetailResponse {
  summary: MarketplaceListingSummaryResponse;
  theme: ScannerTheme;
  reviews: MarketplaceReviewResponse[];
}

export interface MarketplaceReviewResponse {
  id: string;
  reviewerUsername: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export function listSavedDesigns() {
  return sessionRequest<SavedToolDesignResponse[]>("/api/marketplace/designs");
}

export function saveDesign(name: string, theme: ScannerTheme) {
  return sessionRequest<SavedToolDesignResponse>("/api/marketplace/designs", {
    method: "POST",
    body: JSON.stringify({ name, theme }),
  });
}

export function deleteSavedDesign(id: string) {
  return sessionRequest<void>(`/api/marketplace/designs/${id}`, { method: "DELETE" });
}

export function publishDesign(designId: string, title: string, description: string | null) {
  return sessionRequest<MarketplaceListingSummaryResponse>(`/api/marketplace/designs/${designId}/publish`, {
    method: "POST",
    body: JSON.stringify({ title, description }),
  });
}

export function listMarketplaceListings(query?: string) {
  const qs = query ? `?query=${encodeURIComponent(query)}` : "";
  return sessionRequest<MarketplaceListingSummaryResponse[]>(`/api/marketplace/listings${qs}`);
}

export function getMarketplaceListing(id: string) {
  return sessionRequest<MarketplaceListingDetailResponse>(`/api/marketplace/listings/${id}`);
}

export function listMyListings() {
  return sessionRequest<MarketplaceListingSummaryResponse[]>("/api/marketplace/mine");
}

export function submitReview(listingId: string, rating: number, comment: string | null) {
  return sessionRequest<MarketplaceReviewResponse>(`/api/marketplace/listings/${listingId}/reviews`, {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
  });
}

// 402 (ApiError with status 402) means the caller's server is on the Free plan - same gate as
// Tool Designer's own theme save.
export function installListing(listingId: string, serverId: string) {
  return sessionRequest<ScannerTheme>(`/api/marketplace/listings/${listingId}/install`, {
    method: "POST",
    body: JSON.stringify({ serverId }),
  });
}

// Cross-server - every scan on the platform, not just one server's own. Distinct from
// listScans()/getScan() above, which are scoped to whichever server the caller's API key
// belongs to.
export interface AdminScanSummaryResponse {
  id: string;
  playerIdentifier: string;
  status: ScanStatus;
  riskScore: number | null;
  createdAt: string;
  completedAt: string | null;
  serverId: string;
  serverName: string;
  createdByUsername: string | null;
  detectionCount: number;
}

export interface AdminScanDetailResponse {
  scan: AdminScanSummaryResponse;
  results: ScanResultSummaryResponse[];
  detections: DetectionResponse[];
}

export function listAdminScans(query?: string, status?: string) {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (status) params.set("status", status);
  const qs = params.toString();
  return sessionRequest<AdminScanSummaryResponse[]>(`/api/admin/scans${qs ? `?${qs}` : ""}`);
}

export function getAdminScan(id: string) {
  return sessionRequest<AdminScanDetailResponse>(`/api/admin/scans/${id}`);
}

// Irreversible - see AdminController.DeleteScan for why this only exists here, not on the
// per-server scan endpoints.
export function deleteAdminScan(id: string) {
  return sessionRequest<void>(`/api/admin/scans/${id}`, { method: "DELETE" });
}

// --- Biletlerim (Controllers/TicketsController.cs) -----------------------------------------
// Read-only mirror of the customer's own Discord support tickets, synced in live by a separate
// bot (nexus-ticketbot). No write endpoints anywhere here - replies only ever happen on
// Discord, this is a transcript viewer, not a second inbox. Scoped by the caller's own linked
// Discord ID server-side, so only tickets that user actually opened ever come back.

export interface SupportTicketSummaryResponse {
  id: string;
  ticketNumber: number;
  category: string;
  status: "Open" | "Closed";
  openedAt: string;
  closedAt: string | null;
  messageCount: number;
}

export interface SupportTicketMessageResponse {
  id: string;
  authorDiscordId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  isStaff: boolean;
  content: string;
  createdAt: string;
}

export interface SupportTicketDetailResponse {
  summary: SupportTicketSummaryResponse;
  messages: SupportTicketMessageResponse[];
}

export function listMyTickets() {
  return sessionRequest<SupportTicketSummaryResponse[]>("/api/tickets");
}

export function getTicket(id: string) {
  return sessionRequest<SupportTicketDetailResponse>(`/api/tickets/${id}`);
}
