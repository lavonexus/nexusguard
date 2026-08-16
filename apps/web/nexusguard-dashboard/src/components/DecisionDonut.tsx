"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";

export interface DecisionBucket {
  label: string;
  value: number;
  color: string;
}

// Status-coded donut (clean/suspicious/cheating/pending are states, not arbitrary series),
// so it draws from the fixed status palette rather than the categorical one. Each segment
// gets a 2px surface gap; the legend carries the counts so color never has to be read alone.
export default function DecisionDonut({ buckets }: { buckets: DecisionBucket[] }) {
  const { locale } = useLocale();
  const total = buckets.reduce((sum, b) => sum + b.value, 0);
  const size = 160;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const gapDeg = total > 0 ? 3 : 0;

  let cumulativeDeg = -90;

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {total === 0 ? (
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#27272a" strokeWidth={stroke} />
          ) : (
            buckets.map((b) => {
              if (b.value === 0) return null;
              const fraction = b.value / total;
              const segDeg = fraction * 360 - gapDeg;
              const dash = (segDeg / 360) * circumference;
              const rotation = cumulativeDeg;
              cumulativeDeg += fraction * 360;

              return (
                <circle
                  key={b.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={b.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${Math.max(dash, 0)} ${circumference}`}
                  strokeLinecap="butt"
                  transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
                />
              );
            })
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-white">{total}</span>
          <span className="text-[10px] text-zinc-500">{locale === "en" ? "total scans" : "toplam tarama"}</span>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {buckets.map((b) => (
          <div key={b.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-zinc-300">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
              {b.label}
            </span>
            <span className="text-zinc-500">
              {b.value}{" "}
              <span className="text-zinc-600">{total > 0 ? `${Math.round((b.value / total) * 100)}%` : "0%"}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
