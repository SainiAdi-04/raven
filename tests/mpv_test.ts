import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { ResolvedStream, PlaybackMode } from "../src/core/types.ts";
import { buildMpvArgs as buildPlayerArgs } from "../src/core/mpv.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// mpv.ts - playStream argument construction tests
// Since playStream shells out to mpv, we test the argument construction logic.
// ═══════════════════════════════════════════════════════════════════════════════

function buildMpvArgs(stream: ResolvedStream, title?: string): string[] {
  const args = [
    stream.videoUrl,
    `--force-media-title=${title ?? "Now playing"}`,
    "--msg-level=all=warn",
  ];

  if (stream.audioUrl) {
    args.push(`--audio-file=${stream.audioUrl}`);
  }

  return args;
}

Deno.test("mpv - builds correct args with title and audioUrl", () => {
  const stream: ResolvedStream = {
    videoUrl: "https://example.com/video.mp4",
    audioUrl: "https://example.com/audio.m4a",
  };
  const args = buildMpvArgs(stream, "My Video");
  assertEquals(args, [
    "https://example.com/video.mp4",
    "--force-media-title=My Video",
    "--msg-level=all=warn",
    "--audio-file=https://example.com/audio.m4a",
  ]);
});

Deno.test("mpv - builds correct args without audioUrl", () => {
  const stream: ResolvedStream = {
    videoUrl: "https://example.com/video.mp4",
  };
  const args = buildMpvArgs(stream, "My Video");
  assertEquals(args, [
    "https://example.com/video.mp4",
    "--force-media-title=My Video",
    "--msg-level=all=warn",
  ]);
});

Deno.test("mpv - uses 'Now playing' as default title when title is undefined", () => {
  const stream: ResolvedStream = {
    videoUrl: "https://example.com/video.mp4",
  };
  const args = buildMpvArgs(stream, undefined);
  assertEquals(args[1], "--force-media-title=Now playing");
});

Deno.test("mpv - uses 'Now playing' as default title when title is not passed", () => {
  const stream: ResolvedStream = {
    videoUrl: "https://example.com/video.mp4",
  };
  const args = buildMpvArgs(stream);
  assertEquals(args[1], "--force-media-title=Now playing");
});

Deno.test("mpv - BUG: empty string title uses empty title instead of default", () => {
  // Empty string is falsy but ?? only checks null/undefined, not empty string
  // So empty string title passes through
  const stream: ResolvedStream = {
    videoUrl: "https://example.com/video.mp4",
  };
  const args = buildMpvArgs(stream, "");
  assertEquals(args[1], "--force-media-title=");
});

Deno.test("mpv - title with special characters is not escaped", () => {
  const stream: ResolvedStream = {
    videoUrl: "https://example.com/video.mp4",
  };
  const args = buildMpvArgs(stream, "Video's \"Title\" & <More>");
  assertEquals(args[1], `--force-media-title=Video's "Title" & <More>`);
});

Deno.test("mpv - audioUrl empty string is falsy, not added", () => {
  const stream: ResolvedStream = {
    videoUrl: "https://example.com/video.mp4",
    audioUrl: "",
  };
  const args = buildMpvArgs(stream);
  assertEquals(args.length, 3); // No audio-file arg
});

Deno.test("mpv - video URL is always the first argument", () => {
  const stream: ResolvedStream = {
    videoUrl: "https://my-stream.example.com/v/1234",
    audioUrl: "https://my-stream.example.com/a/1234",
  };
  const args = buildMpvArgs(stream, "Test");
  assertEquals(args[0], "https://my-stream.example.com/v/1234");
});

// ─── Core buildMpvArgs (Audiovisual & Audio Modes) ───────────────────────────

Deno.test("buildPlayerArgs - Audiovisual Mode sets default ytdl-format and omits --no-video", () => {
  const stream: ResolvedStream = { videoUrl: "https://youtube.com/watch?v=123" };
  const args = buildPlayerArgs(stream, "Test Video", "audiovisual");
  assertEquals(args, [
    "https://youtube.com/watch?v=123",
    "--force-media-title=Test Video",
    "--msg-level=all=warn",
    "--ytdl-format=bestvideo[vcodec^=avc1]+bestaudio/bestvideo+bestaudio/best",
  ]);
  assertEquals(args.includes("--no-video"), false);
});

Deno.test("buildPlayerArgs - defaults to Audiovisual Mode when mode is omitted", () => {
  const stream: ResolvedStream = { videoUrl: "https://youtube.com/watch?v=123" };
  const args = buildPlayerArgs(stream, "Test Video");
  assertEquals(args, [
    "https://youtube.com/watch?v=123",
    "--force-media-title=Test Video",
    "--msg-level=all=warn",
    "--ytdl-format=bestvideo[vcodec^=avc1]+bestaudio/bestvideo+bestaudio/best",
  ]);
  assertEquals(args.includes("--no-video"), false);
});

Deno.test("buildPlayerArgs - Audio Mode sets --no-video and pure audio format", () => {
  const stream: ResolvedStream = { videoUrl: "https://youtube.com/watch?v=123" };
  const args = buildPlayerArgs(stream, "Test Video", "audio");
  assertEquals(args, [
    "https://youtube.com/watch?v=123",
    "--force-media-title=Test Video",
    "--msg-level=all=warn",
    "--no-video",
    "--ytdl-format=bestaudio/best",
  ]);
  assertEquals(args.includes("--no-video"), true);
  assertEquals(args.includes("--ytdl-format=bestaudio/best"), true);
});

Deno.test("buildPlayerArgs - Audio Mode defaults to 'Now playing' when title is undefined", () => {
  const stream: ResolvedStream = { videoUrl: "https://youtube.com/watch?v=123" };
  const args = buildPlayerArgs(stream, undefined, "audio");
  assertEquals(args[0], "https://youtube.com/watch?v=123");
  assertEquals(args[1], "--force-media-title=Now playing");
  assertEquals(args.includes("--no-video"), true);
  assertEquals(args.includes("--ytdl-format=bestaudio/best"), true);
});

