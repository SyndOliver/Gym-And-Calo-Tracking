// Helper để xử lý URL video (chủ yếu YouTube)

export type VideoInfo = {
  source: "youtube" | "url" | null;
  videoId?: string;
  embedUrl?: string;
  thumbnail?: string;
  watchUrl?: string;
};

const YT_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "music.youtube.com"];

export function parseVideoUrl(input?: string | null): VideoInfo {
  if (!input) return { source: null };
  const raw = input.trim();
  if (!raw) return { source: null };

  // Bare YouTube ID (11 ký tự)
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) {
    return makeYoutube(raw);
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { source: null };
  }

  const host = url.hostname.toLowerCase();

  if (YT_HOSTS.includes(host)) {
    let id: string | null = null;

    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (url.pathname.startsWith("/watch")) {
      id = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/shorts/")) {
      id = url.pathname.split("/")[2] ?? null;
    } else if (url.pathname.startsWith("/embed/")) {
      id = url.pathname.split("/")[2] ?? null;
    } else if (url.pathname.startsWith("/live/")) {
      id = url.pathname.split("/")[2] ?? null;
    }

    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
      const startParam = url.searchParams.get("t") ?? url.searchParams.get("start");
      const start = startParam ? parseTime(startParam) : undefined;
      return makeYoutube(id, start);
    }
  }

  // Fallback: any other URL
  return { source: "url", watchUrl: raw };
}

function makeYoutube(id: string, start?: number): VideoInfo {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  if (start && start > 0) params.set("start", String(start));
  return {
    source: "youtube",
    videoId: id,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`,
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    watchUrl: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ""}`,
  };
}

function parseTime(input: string): number {
  // "90", "1m30s", "1:30"
  if (/^\d+$/.test(input)) return Number(input);
  const m = input.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/);
  if (m && (m[1] || m[2] || m[3])) {
    return (Number(m[1] ?? 0) * 3600) + (Number(m[2] ?? 0) * 60) + Number(m[3] ?? 0);
  }
  const colon = input.split(":").map(Number);
  if (colon.length === 2) return colon[0] * 60 + colon[1];
  if (colon.length === 3) return colon[0] * 3600 + colon[1] * 60 + colon[2];
  return 0;
}

// Tạo URL search YouTube cho bài tập chưa có video
export function youtubeSearchUrl(exerciseName: string, lang: "vi" | "en" = "vi"): string {
  const suffix = lang === "vi" ? " hướng dẫn" : " form tutorial";
  const q = encodeURIComponent(exerciseName + suffix);
  return `https://www.youtube.com/results?search_query=${q}`;
}
