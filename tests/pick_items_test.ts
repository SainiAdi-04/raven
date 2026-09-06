import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { SearchResult } from "../src/core/types.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// Tests for the pick-item construction logic in main.ts
// The main.ts file builds pick items from search results using formatDuration
// and formatViews. We replicate that exact logic to test it.
// ═══════════════════════════════════════════════════════════════════════════════

function formatDuration(seconds?: number): string {
  if (!seconds) return "unknown length";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatViews(count?: number): string {
  if (!count) return "";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K views`;
  return `${count} views`;
}

function buildPickItems(results: SearchResult[]) {
  return results.map((r) => ({
    display: r.title,
    preview: [
      r.title,
      "",
      r.uploader ?? "unknown uploader",
      `${formatDuration(r.duration)}  ${formatViews(r.views)}`,
      r.date ? `Released on: ${r.date}` : "",
    ].join("\n"),
  }));
}

// ─── Full pick item construction ─────────────────────────────────────────────

Deno.test("buildPickItems - full result with all fields", () => {
  const results: SearchResult[] = [
    {
      id: "abc123",
      title: "My Great Video",
      uploader: "TestChannel",
      duration: 125,
      views: 1_500_000,
      date: "15-12-2023",
    },
  ];
  const items = buildPickItems(results);
  assertEquals(items.length, 1);
  assertEquals(items[0].display, "My Great Video");
  const preview = items[0].preview;
  assertEquals(
    preview.includes("My Great Video"),
    true,
  );
  assertEquals(preview.includes("TestChannel"), true);
  assertEquals(preview.includes("2:05"), true);
  assertEquals(preview.includes("1.5M views"), true);
  assertEquals(preview.includes("Released on: 15-12-2023"), true);
});

Deno.test("buildPickItems - result with missing optional fields", () => {
  const results: SearchResult[] = [
    {
      id: "xyz",
      title: "Minimal Video",
    },
  ];
  const items = buildPickItems(results);
  assertEquals(items[0].display, "Minimal Video");
  const preview = items[0].preview;
  assertEquals(preview.includes("unknown uploader"), true);
  assertEquals(preview.includes("unknown length"), true);
  // Empty date produces empty string in the array, but still gets joined
  // The last line would be "" since r.date is undefined
});

Deno.test("buildPickItems - preview has exactly 5 lines joined by newlines", () => {
  const results: SearchResult[] = [
    {
      id: "test",
      title: "Test",
      uploader: "User",
      duration: 60,
      views: 100,
      date: "01-01-2024",
    },
  ];
  const items = buildPickItems(results);
  const lines = items[0].preview.split("\n");
  assertEquals(lines.length, 5);
  assertEquals(lines[0], "Test"); // title
  assertEquals(lines[1], ""); // empty line
  assertEquals(lines[2], "User"); // uploader
  assertEquals(lines[3], "1:00  100 views"); // duration + views
  assertEquals(lines[4], "Released on: 01-01-2024"); // date
});

Deno.test("buildPickItems - preview without date has empty last line", () => {
  const results: SearchResult[] = [
    {
      id: "test",
      title: "Test",
      uploader: "User",
      duration: 60,
      views: 100,
    },
  ];
  const items = buildPickItems(results);
  const lines = items[0].preview.split("\n");
  assertEquals(lines.length, 5);
  assertEquals(lines[4], ""); // Empty date line
});

Deno.test("buildPickItems - BUG: duration 0 and views 0 produce 'unknown length' and empty views", () => {
  const results: SearchResult[] = [
    {
      id: "zero",
      title: "Zero Stats",
      duration: 0,
      views: 0,
    },
  ];
  const items = buildPickItems(results);
  const lines = items[0].preview.split("\n");
  // "unknown length  " (formatViews(0) returns "")
  assertEquals(lines[3], "unknown length  ");
});

Deno.test("buildPickItems - empty results array produces empty items", () => {
  const items = buildPickItems([]);
  assertEquals(items.length, 0);
});

Deno.test("buildPickItems - multiple results produce correct number of items", () => {
  const results: SearchResult[] = [
    { id: "1", title: "Video A" },
    { id: "2", title: "Video B" },
    { id: "3", title: "Video C" },
  ];
  const items = buildPickItems(results);
  assertEquals(items.length, 3);
  assertEquals(items[0].display, "Video A");
  assertEquals(items[1].display, "Video B");
  assertEquals(items[2].display, "Video C");
});

// ─── display field is used for fzf matching ──────────────────────────────────

Deno.test("buildPickItems - display equals title exactly", () => {
  const results: SearchResult[] = [
    { id: "1", title: "   Spaced Title   " },
  ];
  const items = buildPickItems(results);
  // display is set to r.title directly, no trimming
  assertEquals(items[0].display, "   Spaced Title   ");
});
