/**
 * YouTube Presentation Adapter for Lineage 64.
 *
 * Deterministically parses and normalizes YouTube URLs to extract video IDs
 * and derive official thumbnail URLs without external network calls.
 */

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export interface YouTubeMediaInfo {
  readonly videoId: string;
  readonly thumbnailUrl: string;
  readonly embedUrl: string;
  readonly watchUrl: string;
}

/**
 * Normalizes a YouTube URL or video ID into an 11-character video ID.
 * Returns null if the URL is invalid, empty, or not a recognized YouTube URL.
 */
export function extractYouTubeVideoId(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Direct 11-char video ID check
  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const urlString = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : "https://" + trimmed;
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // youtu.be/<id>
    if (hostname === "youtu.be" || hostname.endsWith(".youtu.be")) {
      const pathId = url.pathname.slice(1).split("/")[0]?.split("?")[0];
      if (pathId && YOUTUBE_ID_REGEX.test(pathId)) return pathId;
    }

    // youtube.com, m.youtube.com, www.youtube.com
    if (
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "youtube-nocookie.com" ||
      hostname.endsWith(".youtube-nocookie.com")
    ) {
      // /watch?v=<id>
      const vParam = url.searchParams.get("v");
      if (vParam && YOUTUBE_ID_REGEX.test(vParam)) return vParam;

      // /shorts/<id>
      if (url.pathname.startsWith("/shorts/")) {
        const shortId = url.pathname.split("/")[2]?.split("?")[0];
        if (shortId && YOUTUBE_ID_REGEX.test(shortId)) return shortId;
      }

      // /embed/<id>
      if (url.pathname.startsWith("/embed/")) {
        const embedId = url.pathname.split("/")[2]?.split("?")[0];
        if (embedId && YOUTUBE_ID_REGEX.test(embedId)) return embedId;
      }

      // /v/<id>
      if (url.pathname.startsWith("/v/")) {
        const vId = url.pathname.split("/")[2]?.split("?")[0];
        if (vId && YOUTUBE_ID_REGEX.test(vId)) return vId;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Derives YouTube presentation metadata from a URL or video ID.
 */
export function getYouTubeMediaInfo(input: string | null | undefined): YouTubeMediaInfo | null {
  const videoId = extractYouTubeVideoId(input);
  if (!videoId) return null;

  return {
    videoId,
    thumbnailUrl: "https://img.youtube.com/vi/" + videoId + "/hqdefault.jpg",
    embedUrl: "https://www.youtube-nocookie.com/embed/" + videoId + "?autoplay=1&rel=0",
    watchUrl: "https://www.youtube.com/watch?v=" + videoId,
  };
}
