// Purely decorative abstract geometry for the hero backdrop - dark faceted shapes fading
// into the page on both sides, with a soft violet glow overhead. No data, no claims.
export default function HeroBackdrop() {
  const leftShapes = [
    { left: "2%", top: 260, w: 90, h: 220, rot: -3 },
    { left: "9%", top: 160, w: 70, h: 320, rot: 2 },
    { left: "16%", top: 300, w: 100, h: 180, rot: -1 },
    { left: "24%", top: 220, w: 60, h: 260, rot: 4 },
  ];
  const rightShapes = [
    { right: "2%", top: 260, w: 90, h: 220, rot: 3 },
    { right: "9%", top: 160, w: 70, h: 320, rot: -2 },
    { right: "16%", top: 300, w: 100, h: 180, rot: 1 },
    { right: "24%", top: 220, w: 60, h: 260, rot: -4 },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(55% 45% at 50% 20%, rgba(139,92,246,0.20) 0%, rgba(9,9,11,0) 70%)",
        }}
      />
      {leftShapes.map((s, i) => (
        <div
          key={`l${i}`}
          className="absolute"
          style={{
            left: s.left,
            top: s.top,
            width: s.w,
            height: s.h,
            transform: `rotate(${s.rot}deg)`,
            background: "linear-gradient(180deg, #3d2769 0%, #0a0714 100%)",
            clipPath: "polygon(0% 100%, 0% 30%, 50% 0%, 100% 30%, 100% 100%)",
            opacity: 0.6,
          }}
        />
      ))}
      {rightShapes.map((s, i) => (
        <div
          key={`r${i}`}
          className="absolute"
          style={{
            right: s.right,
            top: s.top,
            width: s.w,
            height: s.h,
            transform: `rotate(${s.rot}deg)`,
            background: "linear-gradient(180deg, #3d2769 0%, #0a0714 100%)",
            clipPath: "polygon(0% 100%, 0% 30%, 50% 0%, 100% 30%, 100% 100%)",
            opacity: 0.6,
          }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent" />
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-zinc-950 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-zinc-950 to-transparent" />
    </div>
  );
}
