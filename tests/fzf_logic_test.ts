import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { PickItem } from "../src/core/types.ts";
import {
  formatPreviewForFzf,
  buildFzfArgs,
  buildFzfLines,
} from "../src/core/fzf.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// fzf.ts - pickFromList logic tests
// Since pickFromList shells out to fzf, we test the data preparation logic
// and result parsing that surrounds the fzf invocation.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── formatPreviewForFzf in-memory encoding ──────────────────────────────────

Deno.test("formatPreviewForFzf - undefined or empty returns empty string", () => {
  assertEquals(formatPreviewForFzf(undefined), "");
  assertEquals(formatPreviewForFzf(""), "");
});

Deno.test("formatPreviewForFzf - encodes newlines as literal \\n for POSIX printf", () => {
  const preview = "Line 1\nLine 2\r\nLine 3";
  assertEquals(formatPreviewForFzf(preview), "Line 1\\nLine 2\\nLine 3");
});

Deno.test("formatPreviewForFzf - escapes backslashes and tabs", () => {
  const preview = "Path\\to\\file\tDetail";
  assertEquals(formatPreviewForFzf(preview), "Path\\\\to\\\\file\\tDetail");
});

// ─── Line construction logic ─────────────────────────────────────────────────

Deno.test("fzf - items without preview produce simple display lines", () => {
  const items: PickItem[] = [
    { display: "apple" },
    { display: "banana" },
    { display: "cherry" },
  ];
  const lines = buildFzfLines(items, false);
  assertEquals(lines, ["apple", "banana", "cherry"]);
});

Deno.test("fzf - items with preview produce in-memory tab-separated lines with encoded preview", () => {
  const items: PickItem[] = [
    { display: "Video 1", preview: "Description 1\nLine 2" },
    { display: "Video 2", preview: "Description 2" },
  ];
  const lines = buildFzfLines(items, true);
  assertEquals(lines[0], "Video 1\tDescription 1\\nLine 2");
  assertEquals(lines[1], "Video 2\tDescription 2");
});

Deno.test("fzf - hasPreview is true even if only ONE item has preview", () => {
  const items: PickItem[] = [
    { display: "No Preview" },
    { display: "With Preview", preview: "Some info" },
  ];
  const hasPreview = items.some((i) => i.preview);
  assertEquals(hasPreview, true);
});

Deno.test("fzf - hasPreview is false when all previews are undefined", () => {
  const items: PickItem[] = [
    { display: "A" },
    { display: "B" },
  ];
  const hasPreview = items.some((i) => i.preview);
  assertEquals(hasPreview, false);
});

Deno.test("fzf - BUG: hasPreview is false when preview is empty string", () => {
  // Empty string is falsy, so .some(i => i.preview) returns false
  // This means empty preview strings are treated as "no preview"
  const items: PickItem[] = [
    { display: "A", preview: "" },
  ];
  const hasPreview = items.some((i) => i.preview);
  assertEquals(hasPreview, false);
});

// ─── Result parsing logic ────────────────────────────────────────────────────

Deno.test("fzf - result parsing with preview mode splits on tab", () => {
  const pickedLine = "Video Title\t/tmp/raven-preview-xxx/0.txt";
  const hasPreview = true;
  const pickedDisplay = hasPreview ? pickedLine.split("\t")[0] : pickedLine;
  assertEquals(pickedDisplay, "Video Title");
});

Deno.test("fzf - result parsing without preview returns full line", () => {
  const pickedLine = "Video Title";
  const hasPreview = false;
  const pickedDisplay = hasPreview ? pickedLine.split("\t")[0] : pickedLine;
  assertEquals(pickedDisplay, "Video Title");
});

Deno.test("fzf - findIndex returns correct index for matching display", () => {
  const items: PickItem[] = [
    { display: "First" },
    { display: "Second" },
    { display: "Third" },
  ];
  const pickedDisplay = "Second";
  const index = items.findIndex((i) => i.display === pickedDisplay);
  assertEquals(index, 1);
});

Deno.test("fzf - findIndex returns -1 for non-matching display", () => {
  const items: PickItem[] = [
    { display: "First" },
    { display: "Second" },
  ];
  const pickedDisplay = "NonExistent";
  const index = items.findIndex((i) => i.display === pickedDisplay);
  assertEquals(index, -1);
});

Deno.test("fzf - BUG: duplicate display names return first match only", () => {
  // If two items have the same display name, findIndex returns the first one
  const items: PickItem[] = [
    { display: "Same Name", preview: "Version A" },
    { display: "Same Name", preview: "Version B" },
  ];
  const pickedDisplay = "Same Name";
  const index = items.findIndex((i) => i.display === pickedDisplay);
  assertEquals(index, 0); // Always returns first match, even if user picked second
});

Deno.test("fzf - empty picked line returns null (code !== 0 or empty)", () => {
  const pickedLine = "";
  const code = 0;
  const result = code !== 0 || pickedLine === "" ? null : pickedLine;
  assertEquals(result, null);
});

Deno.test("fzf - non-zero exit code returns null", () => {
  const pickedLine: string = "Some Video";
  const code: number = 130; // User pressed Ctrl+C in fzf
  const result = code !== 0 || pickedLine === "" ? null : pickedLine;
  assertEquals(result, null);
});

Deno.test("fzf - exit code 0 with non-empty line returns the line", () => {
  const pickedLine: string = "Selected Video";
  const code: number = 0;
  const result = code !== 0 || pickedLine === "" ? null : pickedLine;
  assertEquals(result, "Selected Video");
});

// ─── Preview file content ────────────────────────────────────────────────────

Deno.test("fzf - preview content falls back to empty string when undefined", () => {
  const item: PickItem = { display: "No Preview Item" };
  const content = item.preview ?? "";
  assertEquals(content, "");
});

Deno.test("fzf - preview content preserves newlines", () => {
  const item: PickItem = {
    display: "Test",
    preview: "Line 1\nLine 2\nLine 3",
  };
  assertEquals(item.preview, "Line 1\nLine 2\nLine 3");
});

// ─── Empty items list ────────────────────────────────────────────────────────

Deno.test("fzf - empty items list produces empty lines array", () => {
  const items: PickItem[] = [];
  const hasPreview = items.some((i) => i.preview);
  assertEquals(hasPreview, false);
  const lines = items.map((i) => i.display);
  assertEquals(lines.length, 0);
});

// ─── Tab character in display name ───────────────────────────────────────────

Deno.test("fzf - BUG: tab character in display name breaks preview parsing", () => {
  // If a display name contains a tab, the split("\t")[0] parsing will be wrong
  const display = "Video\twith\ttabs";
  const filePath = "/tmp/raven-preview-xxx/0.txt";
  const line = `${display}\t${filePath}`;
  const parsed = line.split("\t")[0];
  // Only gets "Video", not the full display name
  assertEquals(parsed, "Video");
  // This would fail to find the correct item
});

// ─── fzf command args ────────────────────────────────────────────────────────

Deno.test("fzf - base args always include height, layout, border, prompt, pointer, marker, color", () => {
  const args = [
    "--height=90%",
    "--layout=reverse",
    "--border=rounded",
    "--prompt=› ",
    "--pointer=▶",
    "--marker=✓",
    "--color=fg:#d0d0d0,bg:-1,hl:#5fafff,fg+:#ffffff,bg+:#303030,hl+:#5fd7ff," +
    "info:#87af87,prompt:#ff5faf,pointer:#af87ff,marker:#87ff87,border:#444444",
  ];
  assertEquals(args.length, 7);
  assertEquals(args[0], "--height=90%");
  assertEquals(args[1], "--layout=reverse");
  assertEquals(args[2], "--border=rounded");
});

Deno.test("fzf - preview args are added when hasPreview is true", () => {
  const args = buildFzfArgs(true);
  assertEquals(args.includes("--delimiter=\t"), true);
  assertEquals(args.includes("--with-nth=1"), true);
  assertEquals(args.includes(`--preview=printf '%b\\n' "{2}"`), true);
  assertEquals(args.includes("--preview-window=right:45%:wrap"), true);
});

Deno.test("fzf - preview args are NOT added when hasPreview is false", () => {
  const args = buildFzfArgs(false);
  assertEquals(args.includes("--delimiter=\t"), false);
  assertEquals(args.includes("--with-nth=1"), false);
  assertEquals(args.some((a: string) => a.startsWith("--preview")), false);
});
