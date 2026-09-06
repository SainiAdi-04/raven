import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  extractText,
  parseDuration,
  parseViews,
  parseInnerTubeResponse,
  searchInnerTube,
  INNERTUBE_SEARCH_URL,
} from "../src/core/innertube.ts";

// ─── extractText ─────────────────────────────────────────────────────────────

Deno.test("extractText - returns undefined for undefined or empty input", () => {
  assertEquals(extractText(undefined), undefined);
  assertEquals(extractText({}), undefined);
});

Deno.test("extractText - extracts simpleText when present", () => {
  assertEquals(extractText({ simpleText: "Hello World" }), "Hello World");
});

Deno.test("extractText - extracts and concatenates runs when present", () => {
  assertEquals(
    extractText({
      runs: [{ text: "Never " }, { text: "Gonna " }, { text: "Give You Up" }],
    }),
    "Never Gonna Give You Up",
  );
});

Deno.test("extractText - returns empty string for empty runs array", () => {
  assertEquals(extractText({ runs: [] }), "");
});

// ─── parseDuration ──────────────────────────────────────────────────────────

Deno.test("parseDuration - returns undefined for undefined or empty input", () => {
  assertEquals(parseDuration(undefined), undefined);
  assertEquals(parseDuration(""), undefined);
});

Deno.test("parseDuration - parses mm:ss format", () => {
  assertEquals(parseDuration("3:34"), 214);
  assertEquals(parseDuration("0:45"), 45);
  assertEquals(parseDuration("10:00"), 600);
});

Deno.test("parseDuration - parses hh:mm:ss format", () => {
  assertEquals(parseDuration("1:02:15"), 3735);
  assertEquals(parseDuration("2:00:00"), 7200);
});

Deno.test("parseDuration - parses single seconds number", () => {
  assertEquals(parseDuration("45"), 45);
});

Deno.test("parseDuration - returns undefined for non-numeric input", () => {
  assertEquals(parseDuration("LIVE"), undefined);
  assertEquals(parseDuration("abc:def"), undefined);
});

// ─── parseViews ─────────────────────────────────────────────────────────────

Deno.test("parseViews - returns undefined for undefined or empty input", () => {
  assertEquals(parseViews(undefined), undefined);
  assertEquals(parseViews(""), undefined);
  assertEquals(parseViews("No views"), undefined);
});

Deno.test("parseViews - parses full number with commas", () => {
  assertEquals(parseViews("1,812,597,800 views"), 1812597800);
  assertEquals(parseViews("690,843 views"), 690843);
  assertEquals(parseViews("1 view"), 1);
  assertEquals(parseViews("0 views"), 0);
});

Deno.test("parseViews - parses abbreviated numbers (K, M, B)", () => {
  assertEquals(parseViews("690K views"), 690000);
  assertEquals(parseViews("1.5M views"), 1500000);
  assertEquals(parseViews("2.3B views"), 2300000000);
});

// ─── parseInnerTubeResponse ─────────────────────────────────────────────────

const mockInnerTubeJson = {
  contents: {
    twoColumnSearchResultsRenderer: {
      primaryContents: {
        sectionListRenderer: {
          contents: [
            {
              itemSectionRenderer: {
                contents: [
                  {
                    videoRenderer: {
                      videoId: "vid1",
                      title: { runs: [{ text: "Video Title One" }] },
                      ownerText: { runs: [{ text: "Channel A" }] },
                      lengthText: { simpleText: "3:30" },
                      viewCountText: { simpleText: "100,000 views" },
                      publishedTimeText: { simpleText: "2 weeks ago" },
                    },
                  },
                  {
                    // Non-video renderer item (e.g. shelf or ad) should be skipped
                    shelfRenderer: {
                      title: { simpleText: "Trending" },
                    },
                  },
                  {
                    videoRenderer: {
                      videoId: "vid2",
                      title: { simpleText: "Video Title Two" },
                      shortBylineText: { runs: [{ text: "Channel B" }] },
                      thumbnailOverlays: [
                        {
                          thumbnailOverlayTimeStatusRenderer: {
                            text: { simpleText: "1:15:00" },
                          },
                        },
                      ],
                      shortViewCountText: { simpleText: "1.2M views" },
                      publishedTimeText: { simpleText: "1 year ago" },
                    },
                  },
                  {
                    videoRenderer: {
                      videoId: "vid3",
                      title: { runs: [{ text: "Video Title Three" }] },
                      ownerText: { runs: [{ text: "Channel C" }] },
                      lengthText: { simpleText: "0:45" },
                      viewCountText: { simpleText: "500 views" },
                      // publishedTimeText omitted (e.g. upcoming/live)
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  },
};

Deno.test("parseInnerTubeResponse - parses videoRenderer items into canonical SearchResult objects", () => {
  const results = parseInnerTubeResponse(mockInnerTubeJson, 10);
  assertEquals(results.length, 3);

  assertEquals(results[0], {
    id: "vid1",
    title: "Video Title One",
    uploader: "Channel A",
    duration: 210,
    views: 100000,
    date: "2 weeks ago",
  });

  assertEquals(results[1], {
    id: "vid2",
    title: "Video Title Two",
    uploader: "Channel B",
    duration: 4500,
    views: 1200000,
    date: "1 year ago",
  });

  assertEquals(results[2], {
    id: "vid3",
    title: "Video Title Three",
    uploader: "Channel C",
    duration: 45,
    views: 500,
    date: undefined,
  });
});

Deno.test("parseInnerTubeResponse - respects limit parameter", () => {
  const results = parseInnerTubeResponse(mockInnerTubeJson, 2);
  assertEquals(results.length, 2);
  assertEquals(results[0].id, "vid1");
  assertEquals(results[1].id, "vid2");
});

Deno.test("parseInnerTubeResponse - throws on unrecognized response structure", () => {
  assertThrows(
    () => parseInnerTubeResponse({ invalid: "data" }),
    Error,
    "Unrecognized InnerTube response structure",
  );
  assertThrows(
    () => parseInnerTubeResponse(null),
    Error,
    "Unrecognized InnerTube response structure",
  );
});

// ─── searchInnerTube ────────────────────────────────────────────────────────

Deno.test("searchInnerTube - sends correct POST request and returns parsed SearchResult array", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const mockFetch: typeof fetch = (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return Promise.resolve(
      new Response(JSON.stringify(mockInnerTubeJson), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  const results = await searchInnerTube("test query", 2, mockFetch);

  assertEquals(capturedUrl, INNERTUBE_SEARCH_URL);
  assertEquals(capturedInit?.method, "POST");
  const parsedBody = JSON.parse(String(capturedInit?.body));
  assertEquals(parsedBody.query, "test query");
  assertEquals(parsedBody.context?.client?.clientName, "WEB");
  assertEquals(results.length, 2);
  assertEquals(results[0].id, "vid1");
});

Deno.test("searchInnerTube - throws on HTTP error response", async () => {
  const mockFetch: typeof fetch = () => {
    return Promise.resolve(
      new Response("Internal Server Error", {
        status: 500,
      }),
    );
  };

  await assertRejects(
    () => searchInnerTube("failing query", 10, mockFetch),
    Error,
    "InnerTube search failed with HTTP status 500",
  );
});
