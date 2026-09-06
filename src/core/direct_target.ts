const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);

export function normalizeDirectTarget(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function isDirectTarget(input: string): boolean {
  const trimmed = input.trim();
  if (/\s/.test(trimmed)) {
    return false;
  }

  try {
    const normalized = normalizeDirectTarget(trimmed);
    const url = new URL(normalized);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    if (hostname === "youtu.be") {
      const pathSegments = url.pathname.slice(1).split("/").filter(Boolean);
      return pathSegments.length > 0;
    }

    if (YOUTUBE_HOSTS.has(hostname)) {
      if (url.pathname === "/watch") {
        const v = url.searchParams.get("v");
        return Boolean(v && v.trim().length > 0);
      }

      if (url.pathname.startsWith("/shorts/")) {
        const pathSegments = url.pathname.slice("/shorts/".length).split("/").filter(Boolean);
        return pathSegments.length > 0;
      }
    }

    return false;
  } catch {
    return false;
  }
}
