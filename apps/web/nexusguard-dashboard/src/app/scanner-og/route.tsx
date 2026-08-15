import { ImageResponse } from "next/og";

export const runtime = "nodejs";

// The card shown when the Scanner.exe download link is pasted in Discord/Slack/Telegram/etc -
// see download-scanner/route.ts, which points og:image at this route for bot requests only.
// Redrawn from Logo.tsx's shield+network glyph (same path data) rather than a static PNG, so
// it stays in sync with the site's own mark instead of drifting into a second copy of it.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 30% 35%, #1a0f33 0%, #0a0612 55%, #030105 100%)",
        }}
      >
        <svg width="220" height="220" viewBox="0 0 24 24" style={{ marginRight: 48 }}>
          <path
            d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z"
            fill="#7C3AED"
            stroke="white"
            strokeWidth="0.5"
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
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700 }}>
          <span style={{ color: "#4C1D95" }}>Nexus</span>
          <span style={{ color: "#A78BFA" }}>Guard</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
