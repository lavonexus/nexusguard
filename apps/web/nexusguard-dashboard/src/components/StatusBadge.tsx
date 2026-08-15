import type { ScanStatus } from "@/lib/api";

const STYLES: Record<ScanStatus, string> = {
  Pending: "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20",
  TokenIssued: "bg-sky-500/10 text-sky-400 ring-sky-500/20",
  InProgress: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  Completed: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  Expired: "bg-zinc-500/10 text-zinc-500 ring-zinc-500/20",
  Failed: "bg-red-500/10 text-red-400 ring-red-500/20",
  Cancelled: "bg-zinc-500/10 text-zinc-500 ring-zinc-500/20",
};

const LABELS: Record<ScanStatus, string> = {
  Pending: "Beklemede",
  TokenIssued: "Token verildi",
  InProgress: "Devam ediyor",
  Completed: "Tamamlandı",
  Expired: "Süresi doldu",
  Failed: "Başarısız",
  Cancelled: "İptal edildi",
};

export default function StatusBadge({ status }: { status: ScanStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
