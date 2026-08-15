import type { ScanStatus } from "@/lib/api";

export const CLEAN_THRESHOLD = 25;
export const CHEAT_THRESHOLD = 60;

export type Decision = "Çalışıyor" | "Temiz" | "Uyarı" | "Hile";

const PENDING_STATUSES: ScanStatus[] = ["Pending", "TokenIssued", "InProgress"];

// Shared verdict logic - Overview's donut, the leaderboard, and the scan history table all
// need to agree on what counts as "clean" vs "warning" vs "cheating", so it lives in one place.
export function decisionOf(scan: { status: ScanStatus; riskScore: number | null }): Decision {
  if (PENDING_STATUSES.includes(scan.status)) return "Çalışıyor";
  if (scan.status !== "Completed") return "Çalışıyor"; // Expired/Failed/Cancelled - no verdict was reached
  const risk = scan.riskScore ?? 0;
  if (risk >= CHEAT_THRESHOLD) return "Hile";
  if (risk >= CLEAN_THRESHOLD) return "Uyarı";
  return "Temiz";
}

export const DECISION_COLORS: Record<Decision, string> = {
  Çalışıyor: "#38bdf8",
  Temiz: "#0ca30c",
  Uyarı: "#fab219",
  Hile: "#d03b3b",
};

export const DECISION_TEXT_CLASS: Record<Decision, string> = {
  Çalışıyor: "text-sky-400",
  Temiz: "text-emerald-400",
  Uyarı: "text-amber-400",
  Hile: "text-red-400",
};
