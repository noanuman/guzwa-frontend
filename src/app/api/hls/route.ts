import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Only allow proxying from the known camera domain
  if (!url.startsWith("https://srbija-nadlanu.ott.solutions/")) {
    return NextResponse.json({ error: "Invalid url" }, { status: 403 });
  }

  try {
    const response = await fetch(url);
    const contentType = response.headers.get("content-type") ?? "application/vnd.apple.mpegurl";

    // For m3u8 playlists, rewrite relative URLs to go through our proxy
    if (url.endsWith(".m3u8") || contentType.includes("mpegurl")) {
      let text = await response.text();
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);

      // Rewrite all non-comment, non-empty lines (segment URLs, nested playlists)
      text = text.replace(/^(?!#)(\S+)$/gm, (match) => {
        const trimmed = match.trim();
        if (!trimmed) return match;
        const absoluteUrl = trimmed.startsWith("http") ? trimmed : baseUrl + trimmed;
        return `/api/hls?url=${encodeURIComponent(absoluteUrl)}`;
      });

      // Rewrite key URIs in #EXT-X-KEY lines
      text = text.replace(/URI="([^"]+)"/g, (_match, uri) => {
        const absoluteUrl = uri.startsWith("http") ? uri : baseUrl + uri;
        return `URI="/api/hls?url=${encodeURIComponent(absoluteUrl)}"`;
      });

      return new NextResponse(text, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      });
    }

    // For .ts segments and other files, pass through as binary
    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
