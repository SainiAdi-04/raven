import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type {
  SearchResult,
  ResolvedStream,
  Format,
  PickItem,
  PlaybackMode,
} from "../src/core/types.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// Type interface contract tests
// Verify that objects conforming to the interfaces are valid and that
// optional fields behave correctly.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── SearchResult ────────────────────────────────────────────────────────────

Deno.test("SearchResult - minimal valid object has id and title", () => {
  const result: SearchResult = { id: "abc", title: "Test" };
  assertEquals(result.id, "abc");
  assertEquals(result.title, "Test");
  assertEquals(result.uploader, undefined);
  assertEquals(result.duration, undefined);
  assertEquals(result.views, undefined);
  assertEquals(result.date, undefined);
});

Deno.test("SearchResult - full object with all optional fields", () => {
  const result: SearchResult = {
    id: "xyz",
    title: "Full Video",
    uploader: "Channel",
    duration: 300,
    views: 1000,
    date: "01-01-2024",
  };
  assertEquals(result.uploader, "Channel");
  assertEquals(result.duration, 300);
  assertEquals(result.views, 1000);
  assertEquals(result.date, "01-01-2024");
});

// ─── ResolvedStream ──────────────────────────────────────────────────────────

Deno.test("ResolvedStream - minimal valid object has videoUrl only", () => {
  const stream: ResolvedStream = { videoUrl: "https://example.com/v.mp4" };
  assertEquals(stream.videoUrl, "https://example.com/v.mp4");
  assertEquals(stream.audioUrl, undefined);
});

Deno.test("ResolvedStream - full object with audioUrl", () => {
  const stream: ResolvedStream = {
    videoUrl: "https://example.com/v.mp4",
    audioUrl: "https://example.com/a.m4a",
  };
  assertEquals(stream.audioUrl, "https://example.com/a.m4a");
});

// ─── Format ──────────────────────────────────────────────────────────────────

Deno.test("Format - has formatId and label", () => {
  const format: Format = { formatId: "137", label: "1080p" };
  assertEquals(format.formatId, "137");
  assertEquals(format.label, "1080p");
});

// ─── PickItem ────────────────────────────────────────────────────────────────

Deno.test("PickItem - minimal valid object has display only", () => {
  const item: PickItem = { display: "My Item" };
  assertEquals(item.display, "My Item");
  assertEquals(item.preview, undefined);
});

Deno.test("PickItem - full object with preview", () => {
  const item: PickItem = { display: "My Item", preview: "Details here" };
  assertEquals(item.preview, "Details here");
});

// ─── Type interface: Format is defined but never used in the codebase ─────────

Deno.test("Format interface is defined in types.ts but unused in codebase", () => {
  // This test documents that the Format type exists but is never imported
  // or used by any other module. This is dead code.
  const _format: Format = { formatId: "test", label: "test" };
  assertEquals(typeof _format.formatId, "string");
});

// ─── PlaybackMode ────────────────────────────────────────────────────────────

Deno.test("PlaybackMode - allows 'audiovisual' and 'audio' profiles", () => {
  const mode1: PlaybackMode = "audiovisual";
  const mode2: PlaybackMode = "audio";
  assertEquals(mode1, "audiovisual");
  assertEquals(mode2, "audio");
});

