import type { SearchResult } from "./types.ts";
import { searchInnerTube } from "./innertube.ts";
import { searchYoutube } from "./ytdlp.ts";

export const FALLBACK_NOTICE = "(notice: falling back to yt-dlp search...)";

export interface SearchOptions {
  searchInnerTube?: (query: string, limit?: number) => Promise<SearchResult[]>;
  searchYtDlp?: (query: string, limit?: number) => Promise<SearchResult[]>;
}

export async function searchHybrid(
  query: string,
  limit = 10,
  notify: (message: string) => void = console.error,
  options?: SearchOptions,
): Promise<SearchResult[]> {
  const innerTubeFn = options?.searchInnerTube ?? searchInnerTube;
  const ytDlpFn = options?.searchYtDlp ?? searchYoutube;

  try {
    return await innerTubeFn(query, limit);
  } catch (_err) {
    notify(FALLBACK_NOTICE);
    return await ytDlpFn(query, limit);
  }
}
