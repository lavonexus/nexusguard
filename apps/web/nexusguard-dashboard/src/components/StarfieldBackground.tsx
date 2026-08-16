"use client";

import { useMemo } from "react";

// Three depth layers of stars (small/dim -> large/bright), each a single element whose
// box-shadow holds hundreds of dots - far cheaper than one DOM node per star. Positions are
// randomized once per mount (useMemo), not re-rolled on every render.
function randomStars(count: number, spreadX: number, spreadY: number) {
  const shadows: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * spreadX);
    const y = Math.floor(Math.random() * spreadY);
    shadows.push(`${x}px ${y}px #fff`);
  }
  return shadows.join(", ");
}

const SHOOTING_STARS = [
  { top: "8%", left: "78%", delay: "0s", duration: "7s" },
  { top: "22%", left: "55%", delay: "5.5s", duration: "9s" },
  { top: "48%", left: "90%", delay: "3s", duration: "8s" },
  { top: "68%", left: "35%", delay: "11s", duration: "10s" },
];

// Fixed behind the sidebar/content (see AppShell.tsx), pointer-events-none so it never
// intercepts clicks - purely decorative, matches the violet brand accent already used
// throughout the dashboard rather than a generic starfield.
export default function StarfieldBackground() {
  const smallStars = useMemo(() => randomStars(160, 1920, 1200), []);
  const mediumStars = useMemo(() => randomStars(70, 1920, 1200), []);
  const largeStars = useMemo(() => randomStars(28, 1920, 1200), []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050308]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(139,92,246,0.10),transparent_45%),radial-gradient(circle_at_82%_75%,rgba(109,40,217,0.08),transparent_42%)]" />

      <div className="star-layer" style={{ width: "1px", height: "1px", boxShadow: smallStars, animationDuration: "6s" }} />
      <div
        className="star-layer"
        style={{ width: "1.5px", height: "1.5px", boxShadow: mediumStars, animationDuration: "8s", animationDelay: "1s" }}
      />
      <div
        className="star-layer"
        style={{ width: "2.5px", height: "2.5px", boxShadow: largeStars, animationDuration: "5s", animationDelay: "2s" }}
      />

      {SHOOTING_STARS.map((s, i) => (
        <span
          key={i}
          className="shooting-star"
          style={{ top: s.top, left: s.left, animationDelay: s.delay, animationDuration: s.duration }}
        />
      ))}
    </div>
  );
}
