import type { SearchResult } from "./types.ts";

export const INNERTUBE_SEARCH_URL = "https://www.youtube.com/youtubei/v1/search";

export function extractText(obj?: {
  simpleText?: string;
  runs?: Array<{ text?: string }>;
}): string | undefined {
  if (!obj) return undefined;
  if (typeof obj.simpleText === "string") return obj.simpleText;
  if (Array.isArray(obj.runs)) {
    return obj.runs.map((r) => r.text ?? "").join("");
  }
  return undefined;
}

export function parseDuration(text?: string): number | undefined {
  if (!text) return undefined;
  const parts = text.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n))) return undefined;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return undefined;
}

export function parseViews(text?: string): number | undefined {
  if (!text) return undefined;
  const clean = text.replace(/,/g, "").trim();
  const match = clean.match(/(\d+(?:\.\d+)?)\s*([KMBkmb])?/i);
  if (!match) return undefined;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return undefined;
  const unit = match[2]?.toUpperCase();
  if (unit === "K") return Math.round(num * 1_000);
  if (unit === "M") return Math.round(num * 1_000_000);
  if (unit === "B") return Math.round(num * 1_000_000_000);
  return Math.round(num);
}

// deno-lint-ignore no-explicit-any
export function parseInnerTubeResponse(data: any, limit = 10): SearchResult[] {
  const sectionContents =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;

  if (!Array.isArray(sectionContents)) {
    throw new Error("Unrecognized InnerTube response structure");
  }

  const results: SearchResult[] = [];

  for (const section of sectionContents) {
    const items = section?.itemSectionRenderer?.contents;
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      const vr = item?.videoRenderer;
      if (!vr || typeof vr.videoId !== "string" || !vr.videoId) continue;

      const title = extractText(vr.title);
      if (!title) continue;

      const uploader = extractText(vr.ownerText) ?? extractText(vr.shortBylineText);

      const lengthStr = extractText(vr.lengthText) ??
        // deno-lint-ignore no-explicit-any
        vr.thumbnailOverlays?.find((o: any) => o?.thumbnailOverlayTimeStatusRenderer)
          ?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText;
      const duration = parseDuration(lengthStr);

      const viewStr = extractText(vr.viewCountText) ?? extractText(vr.shortViewCountText);
      const views = parseViews(viewStr);

      const date = extractText(vr.publishedTimeText);

      results.push({
        id: vr.videoId,
        title,
        uploader,
        duration,
        views,
        date,
      });

      if (results.length >= limit) {
        return results;
      }
    }
  }

  return results;
}

export async function searchInnerTube(
  query: string,
  limit = 10,
  fetchFn: typeof fetch = fetch,
): Promise<SearchResult[]> {
  const response = await fetchFn(INNERTUBE_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20230515.00.00",
        },
      },
      query,
    }),
  });

  if (!response.ok) {
    throw new Error(`InnerTube search failed with HTTP status ${response.status}`);
  }

  const data = await response.json();
  return parseInnerTubeResponse(data, limit);
}
