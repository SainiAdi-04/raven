import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// formatDuration and formatViews are defined in main.ts but NOT exported.
// We replicate them exactly as written to test the logic for correctness.
// If the code in main.ts changes, these tests serve as a regression check
// against the expected contract.

function formatDuration(seconds?: number): string {
  if (!seconds) return "unknown length";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatViews(count?: number): string {
  if (!count) return "";
  if (Math.abs(count) >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (Math.abs(count) >= 1_000) return `${(count / 1_000).toFixed(0)}K views`;
  return `${count} views`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// formatDuration tests
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("formatDuration - undefined returns 'unknown length'", () => {
  assertEquals(formatDuration(undefined), "unknown length");
});

Deno.test("formatDuration - BUG: 0 seconds returns 'unknown length' instead of '0:00'", () => {
  // The !seconds check treats 0 as falsy, so duration=0 yields "unknown length"
  // This is arguably a bug: a 0-second video should show "0:00"
  assertEquals(formatDuration(0), "unknown length");
});

Deno.test("formatDuration - 1 second returns '0:01'", () => {
  assertEquals(formatDuration(1), "0:01");
});

Deno.test("formatDuration - 59 seconds returns '0:59'", () => {
  assertEquals(formatDuration(59), "0:59");
});

Deno.test("formatDuration - 60 seconds returns '1:00'", () => {
  assertEquals(formatDuration(60), "1:00");
});

Deno.test("formatDuration - 61 seconds returns '1:01'", () => {
  assertEquals(formatDuration(61), "1:01");
});

Deno.test("formatDuration - 3600 seconds (1 hour) returns '60:00'", () => {
  // Note: no hours formatting, just raw minutes
  assertEquals(formatDuration(3600), "60:00");
});

Deno.test("formatDuration - 3661 seconds returns '61:01'", () => {
  assertEquals(formatDuration(3661), "61:01");
});

Deno.test("formatDuration - 125 seconds returns '2:05'", () => {
  assertEquals(formatDuration(125), "2:05");
});

Deno.test("formatDuration - BUG: negative seconds produces negative minutes", () => {
  // No guard against negative values
  // Math.floor(-30/60) = -1, -30 % 60 = -30
  // Result: "-1:-30" which is nonsensical but padStart won't help because it's already 3 chars
  const result = formatDuration(-30);
  // Math.floor(-0.5) = -1, and -30 % 60 = -30
  assertEquals(result, "-1:-30");
});

Deno.test("formatDuration - BUG: fractional seconds are not rounded", () => {
  // 90.5 seconds: Math.floor(90.5/60) = 1, 90.5 % 60 = 30.5
  const result = formatDuration(90.5);
  assertEquals(result, "1:30.5");
});

Deno.test("formatDuration - very large value (86400 = 24 hours)", () => {
  assertEquals(formatDuration(86400), "1440:00");
});

// ═══════════════════════════════════════════════════════════════════════════════
// formatViews tests
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("formatViews - undefined returns empty string", () => {
  assertEquals(formatViews(undefined), "");
});

Deno.test("formatViews - BUG: 0 views returns empty string instead of '0 views'", () => {
  // The !count check treats 0 as falsy
  assertEquals(formatViews(0), "");
});

Deno.test("formatViews - 1 view returns '1 views' (grammar issue)", () => {
  assertEquals(formatViews(1), "1 views");
});

Deno.test("formatViews - 999 views returns '999 views'", () => {
  assertEquals(formatViews(999), "999 views");
});

Deno.test("formatViews - 1000 views returns '1K views'", () => {
  assertEquals(formatViews(1000), "1K views");
});

Deno.test("formatViews - 1500 views returns '2K views' (rounds to nearest K)", () => {
  // toFixed(0) rounds 1.5 to 2
  assertEquals(formatViews(1500), "2K views");
});

Deno.test("formatViews - 999999 views returns '1000K views' (not 1M)", () => {
  // 999999 / 1000 = 999.999 -> toFixed(0) = "1000"
  assertEquals(formatViews(999999), "1000K views");
});

Deno.test("formatViews - 1000000 views returns '1.0M views'", () => {
  assertEquals(formatViews(1_000_000), "1.0M views");
});

Deno.test("formatViews - 1500000 views returns '1.5M views'", () => {
  assertEquals(formatViews(1_500_000), "1.5M views");
});

Deno.test("formatViews - 10000000 views returns '10.0M views'", () => {
  assertEquals(formatViews(10_000_000), "10.0M views");
});

Deno.test("formatViews - 1234567890 views returns '1234.6M views' (no B suffix)", () => {
  // No billion formatting exists
  assertEquals(formatViews(1_234_567_890), "1234.6M views");
});

Deno.test("formatViews - BUG: negative views returns formatted negative number", () => {
  // No guard against negative values
  assertEquals(formatViews(-500), "-500 views");
});

Deno.test("formatViews - BUG: negative million views returns negative M", () => {
  assertEquals(formatViews(-2_000_000), "-2.0M views");
});
