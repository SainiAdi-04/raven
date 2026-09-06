import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { formatYtDlpError } from "../src/core/error.ts";

// ─── Context: "resolve" with private / unavailable keywords ──────────────────

Deno.test("formatYtDlpError - resolve context with 'private' keyword returns private error", () => {
  const err = formatYtDlpError("ERROR: This video is private", "resolve");
  assertEquals(err.message, "this video is private or unavailable");
});

Deno.test("formatYtDlpError - resolve context with 'unavailable' keyword returns private error", () => {
  const err = formatYtDlpError("Video unavailable", "resolve");
  assertEquals(err.message, "this video is private or unavailable");
});

Deno.test("formatYtDlpError - resolve context with 'PRIVATE' (uppercase) returns private error", () => {
  const err = formatYtDlpError("VIDEO IS PRIVATE", "resolve");
  assertEquals(err.message, "this video is private or unavailable");
});

Deno.test("formatYtDlpError - resolve context with 'Unavailable' (mixed case) returns private error", () => {
  const err = formatYtDlpError("Video Unavailable due to policy", "resolve");
  assertEquals(err.message, "this video is private or unavailable");
});

// ─── Context: "search" should NOT trigger private/unavailable branch ─────────

Deno.test("formatYtDlpError - search context with 'private' does NOT return private error (falls to later checks)", () => {
  const err = formatYtDlpError("This video is private", "search");
  // In search context, "private" doesn't trigger the first branch.
  // It also doesn't contain "sign in to confirm" or "age", so falls through to generic.
  assertEquals(err.message, "yt-dlp search failed: This video is private");
});

// ─── Age-restricted / sign-in branch ─────────────────────────────────────────

Deno.test("formatYtDlpError - 'sign in to confirm' triggers age-restricted error", () => {
  const err = formatYtDlpError("ERROR: Sign in to confirm your age", "search");
  assertEquals(
    err.message,
    "this video requires sign-in (age-restricted or similar) — can't be played",
  );
});

Deno.test("formatYtDlpError - 'age' keyword alone triggers age-restricted error", () => {
  const err = formatYtDlpError("age verification required", "resolve");
  assertEquals(
    err.message,
    "this video requires sign-in (age-restricted or similar) — can't be played",
  );
});

Deno.test("formatYtDlpError - 'Sign In To Confirm' (mixed case) triggers age-restricted error", () => {
  const err = formatYtDlpError("Please Sign In To Confirm Your Age", "search");
  assertEquals(
    err.message,
    "this video requires sign-in (age-restricted or similar) — can't be played",
  );
});

Deno.test("formatYtDlpError - 'AGE' (uppercase) in resolve context triggers age-restricted (NOT private)", () => {
  // In resolve context, "AGE" doesn't contain "private" or "unavailable" so skips first branch.
  // But it does contain "age", so hits the sign-in branch.
  const err = formatYtDlpError("AGE RESTRICTED CONTENT", "resolve");
  assertEquals(
    err.message,
    "this video requires sign-in (age-restricted or similar) — can't be played",
  );
});

// ─── Priority: "private" in resolve should win over "age" ────────────────────

Deno.test("formatYtDlpError - resolve context with BOTH 'private' and 'age' returns private error (first branch wins)", () => {
  const err = formatYtDlpError("This private video has age restriction", "resolve");
  assertEquals(err.message, "this video is private or unavailable");
});

Deno.test("formatYtDlpError - resolve context with BOTH 'unavailable' and 'sign in to confirm' returns private error (first branch wins)", () => {
  const err = formatYtDlpError("Unavailable - please sign in to confirm", "resolve");
  assertEquals(err.message, "this video is private or unavailable");
});

// ─── Generic fallback branch ─────────────────────────────────────────────────

Deno.test("formatYtDlpError - generic error in search context", () => {
  const err = formatYtDlpError("some random error", "search");
  assertEquals(err.message, "yt-dlp search failed: some random error");
});

Deno.test("formatYtDlpError - generic error in resolve context", () => {
  const err = formatYtDlpError("connection timed out", "resolve");
  assertEquals(err.message, "yt-dlp resolve failed: connection timed out");
});

Deno.test("formatYtDlpError - empty stderr produces fallback without trailing colon-space", () => {
  const err = formatYtDlpError("", "search");
  assertEquals(err.message, "yt-dlp search failed");
});

Deno.test("formatYtDlpError - whitespace-only stderr produces fallback without message", () => {
  const err = formatYtDlpError("   \n\t  ", "search");
  assertEquals(err.message, "yt-dlp search failed");
});

Deno.test("formatYtDlpError - returns an Error instance", () => {
  const err = formatYtDlpError("test", "search");
  assertEquals(err instanceof Error, true);
});

// ─── Edge case: stderr with leading/trailing whitespace is trimmed ────────────

Deno.test("formatYtDlpError - trims whitespace from stderr before matching", () => {
  const err = formatYtDlpError("   private   ", "resolve");
  assertEquals(err.message, "this video is private or unavailable");
});

Deno.test("formatYtDlpError - trims whitespace for generic message", () => {
  const err = formatYtDlpError("  network error  ", "search");
  assertEquals(err.message, "yt-dlp search failed: network error");
});

// ─── Edge case: 'page' contains 'age' — potential false positive ─────────────

Deno.test("formatYtDlpError - BUG: 'page not found' falsely matches 'age' keyword", () => {
  // The word "page" contains "age" as a substring. This is a potential bug.
  const err = formatYtDlpError("page not found", "search");
  // Current behavior: matches "age" substring and returns age-restricted error
  assertEquals(
    err.message,
    "this video requires sign-in (age-restricted or similar) — can't be played",
  );
});

Deno.test("formatYtDlpError - BUG: 'storage limit exceeded' falsely matches 'age' keyword", () => {
  // "storage" contains "age"
  const err = formatYtDlpError("storage limit exceeded", "resolve");
  assertEquals(
    err.message,
    "this video requires sign-in (age-restricted or similar) — can't be played",
  );
});

Deno.test("formatYtDlpError - BUG: 'package error' falsely matches 'age' keyword", () => {
  // "package" contains "age"
  const err = formatYtDlpError("package error in yt-dlp", "search");
  assertEquals(
    err.message,
    "this video requires sign-in (age-restricted or similar) — can't be played",
  );
});

// ─── Edge case: 'search' context + 'unavailable' -> falls through to age check or generic ─

Deno.test("formatYtDlpError - search context with 'unavailable' falls to generic (no 'age' match)", () => {
  const err = formatYtDlpError("Video unavailable", "search");
  // "search" context skips the private/unavailable branch.
  // "unavailable" doesn't contain "sign in to confirm" or "age", so falls to generic.
  assertEquals(err.message, "yt-dlp search failed: Video unavailable");
});
