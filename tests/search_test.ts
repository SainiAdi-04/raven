import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { searchHybrid, FALLBACK_NOTICE } from "../src/core/search.ts";
import type { SearchResult } from "../src/core/types.ts";

Deno.test("searchHybrid - returns InnerTube results when successful without notice or fallback", async () => {
  const mockInnerTubeResults: SearchResult[] = [
    { id: "it1", title: "Native Video 1" },
    { id: "it2", title: "Native Video 2" },
  ];
  let ytDlpCalled = false;
  const notices: string[] = [];

  const results = await searchHybrid(
    "guitar tutorial",
    10,
    (msg) => notices.push(msg),
    {
      searchInnerTube: (_q, _lim) => Promise.resolve(mockInnerTubeResults),
      searchYtDlp: (_q, _lim) => {
        ytDlpCalled = true;
        return Promise.resolve([]);
      },
    },
  );

  assertEquals(results, mockInnerTubeResults);
  assertEquals(ytDlpCalled, false);
  assertEquals(notices.length, 0);
});

Deno.test("searchHybrid - emits exact notice and falls back to yt-dlp when InnerTube fails", async () => {
  const mockYtDlpResults: SearchResult[] = [
    { id: "yt1", title: "Fallback Video 1" },
  ];
  const notices: string[] = [];
  let fallbackQuery = "";
  let fallbackLimit = 0;

  const results = await searchHybrid(
    "synthwave",
    5,
    (msg) => notices.push(msg),
    {
      searchInnerTube: (_q, _lim) => {
        return Promise.reject(new Error("Network connection reset"));
      },
      searchYtDlp: (q, lim) => {
        fallbackQuery = q;
        fallbackLimit = lim ?? 0;
        return Promise.resolve(mockYtDlpResults);
      },
    },
  );

  assertEquals(results, mockYtDlpResults);
  assertEquals(notices, [FALLBACK_NOTICE]);
  assertEquals(notices[0], "(notice: falling back to yt-dlp search...)");
  assertEquals(fallbackQuery, "synthwave");
  assertEquals(fallbackLimit, 5);
});

Deno.test("searchHybrid - passes default limit 10 when not specified", async () => {
  let innerTubeLimit = 0;

  await searchHybrid(
    "jazz",
    undefined,
    () => {},
    {
      searchInnerTube: (_q, lim) => {
        innerTubeLimit = lim ?? 0;
        return Promise.resolve([]);
      },
      searchYtDlp: () => Promise.resolve([]),
    },
  );

  assertEquals(innerTubeLimit, 10);
});

Deno.test("searchHybrid - passes default limit 10 to fallback when not specified", async () => {
  let fallbackLimit = 0;

  await searchHybrid(
    "jazz",
    undefined,
    () => {},
    {
      searchInnerTube: () => Promise.reject(new Error("InnerTube down")),
      searchYtDlp: (_q, lim) => {
        fallbackLimit = lim ?? 0;
        return Promise.resolve([]);
      },
    },
  );

  assertEquals(fallbackLimit, 10);
});

Deno.test("searchHybrid - propagates error if fallback yt-dlp also throws", async () => {
  const notices: string[] = [];

  await assertRejects(
    () =>
      searchHybrid(
        "broken",
        10,
        (msg) => notices.push(msg),
        {
          searchInnerTube: () => Promise.reject(new Error("InnerTube failed")),
          searchYtDlp: () => Promise.reject(new Error("yt-dlp not installed")),
        },
      ),
    Error,
    "yt-dlp not installed",
  );

  assertEquals(notices, ["(notice: falling back to yt-dlp search...)"]);
});
