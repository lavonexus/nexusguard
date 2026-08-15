import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Streams the same NexusGuard.Scanner.exe binary for every request, but names the download
// after the PIN (e.g. NexusGuard.Scanner_248581.exe). The exe reads its own filename on
// startup and pre-fills the PIN boxes from it - no binary rewriting, no protocol handlers,
// just a filename the browser preserves through the download.
export async function GET(request: NextRequest) {
  const pin = request.nextUrl.searchParams.get("pin") ?? "";
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "A 6-digit pin query parameter is required." }, { status: 400 });
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
