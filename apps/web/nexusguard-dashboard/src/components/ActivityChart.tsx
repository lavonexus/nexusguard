"use client";

import { useId, useState } from "react";

export interface ActivityPoint {
  label: string;
  count: number;
}

const LINE_COLOR = "#8b5cf6"; // brand violet - single series, so one hue is enough (no legend needed)
const GRID_COLOR = "#27272a";
const AXIS_TEXT = "#71717a";

// Single-series area/line chart with a hover crosshair + tooltip, per the dataviz method:
// thin 2px line, recessive gridlines, no legend (one series - the title already names it).
export default function ActivityChart({ points }: { points: ActivityPoint[] }) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 640;
  const height = 220;
  const padding = { top: 12, right: 12, bottom: 24, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const max = Math.max(1, ...points.map((p) => p.count));
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const xAt = (i: number) => padding.left + i * stepX;
  const yAt = (v: number) => padding.top + innerH - (v / max) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(p.count)}`).join(" ");
  const areaPath = `${linePath} L ${xAt(points.length - 1)} ${padding.top + innerH} L ${xAt(0)} ${padding.top + innerH} Z`;

  const yTicks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const labelEvery = Math.ceil(points.length / 6) || 1;

  function handleMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.round(((x - padding.left) / innerW) * (points.length - 1));
    setHoverIndex(Math.min(points.length - 1, Math.max(0, idx)));
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 220 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE_COLOR} stopOpacity="0.35" />
            <stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yAt(t)}
              y2={yAt(t)}
              stroke={GRID_COLOR}
              strokeWidth="1"
            />
            <text x={padding.left - 8} y={yAt(t) + 3} textAnchor="end" fontSize="10" fill={AXIS_TEXT}>
              {t}
            </text>
          </g>
        ))}

        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={p.label} x={xAt(i)} y={height - 6} textAnchor="middle" fontSize="10" fill={AXIS_TEXT}>
              {p.label}
            </text>
          ) : null
        )}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {hoverIndex !== null && (
          <>
            <line
              x1={xAt(hoverIndex)}
              x2={xAt(hoverIndex)}
              y1={padding.top}
              y2={padding.top + innerH}
              stroke={GRID_COLOR}
              strokeWidth="1"
            />
            <circle cx={xAt(hoverIndex)} cy={yAt(points[hoverIndex].count)} r="4" fill={LINE_COLOR} stroke="#09090b" strokeWidth="2" />
          </>
        )}

        <rect
          x={padding.left}
          y={padding.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hovered && hoverIndex !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `${(xAt(hoverIndex) / width) * 100}%` }}
        >
          <div className="font-medium text-zinc-200">{hovered.count} tarama</div>
          <div className="text-zinc-500">{hovered.label}</div>
        </div>
      )}
    </div>
  );
}
