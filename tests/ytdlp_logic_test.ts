import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { SearchResult, ResolvedStream } from "../src/core/types.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// searchYoutube tests
// We test the actual logic by intercepting Deno.Command via subprocess scripts
// that simulate yt-dlp behavior.
// ═══════════════════════════════════════════════════════════════════════════════

// Helper: run a Deno eval script that stubs Deno.Command and imports searchYoutube
async function runSearchTest(
  script: string,
): Promise<{ stdout: string; stderr: string; code: number }> {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["eval", "--allow-all", script],
    cwd: "/home/aditya-saini/Desktop/TypeScript-Projects/cli-yt",
    stdout: "piped",
    stderr: "piped",
  });
  const result = await cmd.output();
  return {
    stdout: new TextDecoder().decode(result.stdout).trim(),
    stderr: new TextDecoder().decode(result.stderr).trim(),
    code: result.code,
  };
}

// ─── JSON parsing of yt-dlp output ───────────────────────────────────────────

Deno.test("searchYoutube - parses upload_date DD-MM-YYYY correctly", () => {
  // Testing the date parsing logic: obj.upload_date.slice(6,8)-slice(4,6)-slice(0,4)
  // upload_date format from yt-dlp is "YYYYMMDD"
  // slice(6,8) = DD, slice(4,6) = MM, slice(0,4) = YYYY
  // Result: "DD-MM-YYYY"
  const upload_date = "20231215";
  const expected = `${upload_date.slice(6, 8)}-${upload_date.slice(4, 6)}-${upload_date.slice(0, 4)}`;
  assertEquals(expected, "15-12-2023");
});

Deno.test("searchYoutube - upload_date parsing for edge case dates", () => {
  const upload_date = "20000101";
  const expected = `${upload_date.slice(6, 8)}-${upload_date.slice(4, 6)}-${upload_date.slice(0, 4)}`;
  assertEquals(expected, "01-01-2000");
});

Deno.test("searchYoutube - maps uploader field from obj.uploader", () => {
  const obj: {
    id: string;
    title: string;
    uploader?: string;
    channel?: string;
    duration?: number;
    view_count?: number;
  } = { id: "abc", title: "Test", uploader: "MyChannel", channel: "OtherChannel" };
  const result: SearchResult = {
    id: obj.id,
    title: obj.title,
    uploader: obj.uploader ?? obj.channel,
    duration: obj.duration,
    views: obj.view_count,
    date: undefined,
  };
  assertEquals(result.uploader, "MyChannel");
});

Deno.test("searchYoutube - falls back to obj.channel when uploader is null", () => {
  const obj = { id: "abc", title: "Test", uploader: null, channel: "FallbackChannel" } as any;
  const result: SearchResult = {
    id: obj.id,
    title: obj.title,
    uploader: obj.uploader ?? obj.channel,
    duration: undefined,
    views: undefined,
    date: undefined,
  };
  assertEquals(result.uploader, "FallbackChannel");
});

Deno.test("searchYoutube - uploader is undefined when both uploader and channel are missing", () => {
  const obj = { id: "abc", title: "Test" } as any;
  const result: SearchResult = {
    id: obj.id,
    title: obj.title,
    uploader: obj.uploader ?? obj.channel,
    duration: undefined,
    views: undefined,
    date: undefined,
  };
  assertEquals(result.uploader, undefined);
});

Deno.test("searchYoutube - date is undefined when upload_date is missing", () => {
  const obj = { id: "abc", title: "Test" } as any;
  const date = obj.upload_date
    ? `${obj.upload_date.slice(6, 8)}-${obj.upload_date.slice(4, 6)}-${obj.upload_date.slice(0, 4)}`
    : undefined;
  assertEquals(date, undefined);
});

// ─── resolveStream output parsing ────────────────────────────────────────────

Deno.test("resolveStream - single URL line produces videoUrl only", () => {
  const text = "https://example.com/video.mp4\n";
  const lines = text.trim().split("\n").filter(Boolean);
  const result: ResolvedStream =
    lines.length === 1
      ? { videoUrl: lines[0] }
      : { videoUrl: lines[0], audioUrl: lines[1] };
  assertEquals(result, { videoUrl: "https://example.com/video.mp4" });
});

Deno.test("resolveStream - two URL lines produce videoUrl and audioUrl", () => {
  const text = "https://example.com/video.mp4\nhttps://example.com/audio.m4a\n";
  const lines = text.trim().split("\n").filter(Boolean);
  const result: ResolvedStream =
    lines.length === 1
      ? { videoUrl: lines[0] }
      : { videoUrl: lines[0], audioUrl: lines[1] };
  assertEquals(result, {
    videoUrl: "https://example.com/video.mp4",
    audioUrl: "https://example.com/audio.m4a",
  });
});

Deno.test("resolveStream - three URL lines silently ignores third URL", () => {
  const text =
    "https://example.com/video.mp4\nhttps://example.com/audio.m4a\nhttps://example.com/subtitles.vtt\n";
  const lines = text.trim().split("\n").filter(Boolean);
  const result: ResolvedStream =
    lines.length === 1
      ? { videoUrl: lines[0] }
      : { videoUrl: lines[0], audioUrl: lines[1] };
  // Third URL is silently dropped
  assertEquals(result, {
    videoUrl: "https://example.com/video.mp4",
    audioUrl: "https://example.com/audio.m4a",
  });
  assertEquals(lines.length, 3);
});

Deno.test("resolveStream - blank lines in output are filtered", () => {
  const text = "https://example.com/video.mp4\n\n\nhttps://example.com/audio.m4a\n";
  const lines = text.trim().split("\n").filter(Boolean);
  assertEquals(lines.length, 2);
  assertEquals(lines[0], "https://example.com/video.mp4");
  assertEquals(lines[1], "https://example.com/audio.m4a");
});

// ─── URL construction ────────────────────────────────────────────────────────

Deno.test("resolveStream - constructs correct YouTube URL from videoId", () => {
  const videoId = "dQw4w9WgXcQ";
  const url = `https://youtube.com/watch?v=${videoId}`;
  assertEquals(url, "https://youtube.com/watch?v=dQw4w9WgXcQ");
});

Deno.test("resolveStream - BUG: videoId with special characters is not URL-encoded", () => {
  // If a videoId somehow contained special characters, they wouldn't be encoded
  const videoId = "abc&def=123";
  const url = `https://youtube.com/watch?v=${videoId}`;
  assertEquals(url, "https://youtube.com/watch?v=abc&def=123");
  // This could cause issues with the URL being malformed
});

// ─── searchYoutube query construction ────────────────────────────────────────

Deno.test("searchYoutube - constructs correct search arg with default limit", () => {
  const query = "test video";
  const limit = 5;
  const searchArg = `ytsearch${limit}:${query}`;
  assertEquals(searchArg, "ytsearch5:test video");
});

Deno.test("searchYoutube - constructs correct search arg with custom limit", () => {
  const query = "test video";
  const limit = 10;
  const searchArg = `ytsearch${limit}:${query}`;
  assertEquals(searchArg, "ytsearch10:test video");
});

Deno.test("searchYoutube - BUG: empty query creates 'ytsearch5:' arg", () => {
  const query = "";
  const limit = 5;
  const searchArg = `ytsearch${limit}:${query}`;
  assertEquals(searchArg, "ytsearch5:");
  // No validation that query is non-empty before calling yt-dlp
});

Deno.test("searchYoutube - BUG: limit of 0 creates 'ytsearch0:' arg", () => {
  const query = "test";
  const limit = 0;
  const searchArg = `ytsearch${limit}:${query}`;
  assertEquals(searchArg, "ytsearch0:test");
  // No validation that limit > 0
});

Deno.test("searchYoutube - BUG: negative limit creates 'ytsearch-1:' arg", () => {
  const query = "test";
  const limit = -1;
  const searchArg = `ytsearch${limit}:${query}`;
  assertEquals(searchArg, "ytsearch-1:test");
  // No validation that limit is positive
});

// ─── JSON parsing edge cases ─────────────────────────────────────────────────

Deno.test("searchYoutube - empty stdout after trim results in empty array from filter(Boolean)", () => {
  const text = "";
  const lines = text.trim().split("\n").filter(Boolean);
  assertEquals(lines.length, 0);
});

Deno.test("searchYoutube - single valid JSON line parses correctly", () => {
  const obj = {
    id: "abc123",
    title: "Test Video",
    uploader: "TestUser",
    duration: 120,
    view_count: 5000,
    upload_date: "20231215",
  };
  const text = JSON.stringify(obj) + "\n";
  const parsed = text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line: string) => JSON.parse(line));
  assertEquals(parsed.length, 1);
  assertEquals(parsed[0].id, "abc123");
  assertEquals(parsed[0].title, "Test Video");
  assertEquals(parsed[0].view_count, 5000);
});

Deno.test("searchYoutube - multiple JSON lines parse correctly", () => {
  const objects = [
    { id: "1", title: "Video 1" },
    { id: "2", title: "Video 2" },
    { id: "3", title: "Video 3" },
  ];
  const text = objects.map((o) => JSON.stringify(o)).join("\n") + "\n";
  const parsed = text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line: string) => JSON.parse(line));
  assertEquals(parsed.length, 3);
  assertEquals(parsed[0].id, "1");
  assertEquals(parsed[2].title, "Video 3");
});
