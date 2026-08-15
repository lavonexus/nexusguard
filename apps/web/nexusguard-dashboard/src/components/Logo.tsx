// Same mark as the Scanner.exe GUI: a shield holding a hub-and-node network glyph, crossed
// by two signal bars. Kept as one SVG so the website and the desktop app read as one brand.
export default function Logo({ className = "h-6 w-6", glow = false }: { className?: string; glow?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={glow ? { filter: "drop-shadow(0 0 10px #8b5cf6aa)" } : undefined}>
      <defs>
        <linearGradient id="ng-shield-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="55%" stopColor="#6D28D9" />
          <stop offset="100%" stopColor="#3B1373" />
        </linearGradient>
      </defs>

      <path
        d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z"
        fill="url(#ng-shield-fill)"
        stroke="white"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />

      <line x1="1.5" y1="15.1" x2="22.5" y2="15.1" stroke="white" strokeWidth="0.45" opacity="0.9" />
      <line x1="1.5" y1="16.5" x2="22.5" y2="16.5" stroke="white" strokeWidth="0.45" opacity="0.9" />

      <line x1="12" y1="10.3" x2="12" y2="6.9" stroke="white" strokeWidth="0.4" />
      <line x1="12" y1="10.3" x2="8.9" y2="8.7" stroke="white" strokeWidth="0.4" />
      <line x1="12" y1="10.3" x2="15.1" y2="8.7" stroke="white" strokeWidth="0.4" />
      <line x1="12" y1="10.3" x2="9.1" y2="12.6" stroke="white" strokeWidth="0.4" />
      <line x1="12" y1="10.3" x2="14.9" y2="12.6" stroke="white" strokeWidth="0.4" />

      <circle cx="12" cy="10.3" r="0.85" fill="white" />
      <circle cx="12" cy="6.9" r="0.7" fill="none" stroke="white" strokeWidth="0.5" />
      <circle cx="8.9" cy="8.7" r="0.7" fill="none" stroke="white" strokeWidth="0.5" />
      <circle cx="15.1" cy="8.7" r="0.7" fill="none" stroke="white" strokeWidth="0.5" />
      <circle cx="9.1" cy="12.6" r="0.7" fill="none" stroke="white" strokeWidth="0.5" />
      <circle cx="14.9" cy="12.6" r="0.7" fill="none" stroke="white" strokeWidth="0.5" />
    </svg>
  );
}
