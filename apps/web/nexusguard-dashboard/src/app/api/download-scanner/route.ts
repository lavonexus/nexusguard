import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Link-preview crawlers (Discord, Slack, Telegram, WhatsApp, ...) fetch this exact URL when
// someone pastes it in a chat - they never open it in a real browser, so serving them the raw
// .exe (application/octet-stream) gives them nothing to build a preview card from, and the
// link shows up bare. Detected by User-Agent, same mechanism Next.js itself uses to special-
// case bots for streaming metadata (see htmlLimitedBots).
const LINK_PREVIEW_BOT_PATTERN =
  /discordbot|slackbot|telegrambot|whatsapp|facebookexternalhit|twitterbot|linkedinbot|skypeuripreview|redditbot|embedly/i;

// Streams the same NexusGuard.Scanner.exe binary for every real request, but names the
// download after the PIN (e.g. NexusGuard.Scanner_248581.exe). The exe reads its own filename
// on startup and pre-fills the PIN boxes from it - no binary rewriting, no protocol handlers,
// just a filename the browser preserves through the download.
export async function GET(request: NextRequest) {
  const pin = request.nextUrl.searchParams.get("pin") ?? "";
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "A 6-digit pin query parameter is required." }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  if (LINK_PREVIEW_BOT_PATTERN.test(userAgent)) {
    // request.nextUrl reflects the Host header the Node process actually received, which
    // behind Render's proxy is its own internal bind address (0.0.0.0:10000), not the public
    // domain - x-forwarded-host/-proto are what the proxy tells us the client actually used.
    const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
    const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : request.nextUrl.origin;
    const url = `${origin}${request.nextUrl.pathname}${request.nextUrl.search}`;

    return new NextResponse(buildPreviewHtml(url, origin, pin), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // The server never trusts the client, including this download link itself - a manually
  // typed PIN, a stale shared link, or someone poking the URL directly with random digits
  // should all fail here rather than silently handing out an exe that Scanner.exe will only
  // reject later once it actually tries to use the PIN.
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080";
  const checkRes = await fetch(`${apiBaseUrl}/api/scanner/pin-check?pin=${pin}`, { cache: "no-store" });
  const { valid } = (await checkRes.json()) as { valid: boolean };
  if (!valid) {
    return NextResponse.json({ error: "Invalid or expired PIN." }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "public", "downloads", "NexusGuard.Scanner.exe");
  const file = await readFile(filePath);

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="NexusGuard.Scanner_${pin}.exe"`,
      "Content-Length": file.length.toString(),
    },
  });
}

function buildPreviewHtml(url: string, origin: string, pin: string): string {
  const title = "NexusGuard Scanner";
  const description = `PIN ${pin} icin tarama araci - indirmek icin tikla.`;
  const image = `${origin}/scanner-og`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
</head>
<body></body>
</html>`;
}
