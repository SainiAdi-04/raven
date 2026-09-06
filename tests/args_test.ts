import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HELP_TEXT, VERSION, getQuery, getPlaybackMode } from "../src/cli/args.ts";

// ─── VERSION ─────────────────────────────────────────────────────────────────

Deno.test("VERSION is a non-empty string", () => {
  assertEquals(typeof VERSION, "string");
  assertEquals(VERSION.length > 0, true);
});

Deno.test("VERSION starts with 'raven'", () => {
  assertStringIncludes(VERSION, "raven");
});

Deno.test("VERSION contains a semver-like version pattern", () => {
  const match = VERSION.match(/v?\d+\.\d+\.\d+/);
  assertEquals(match !== null, true);
});

// ─── HELP_TEXT ────────────────────────────────────────────────────────────────

Deno.test("HELP_TEXT is a non-empty string", () => {
  assertEquals(typeof HELP_TEXT, "string");
  assertEquals(HELP_TEXT.length > 0, true);
});

Deno.test("HELP_TEXT contains USAGE section", () => {
  assertStringIncludes(HELP_TEXT, "USAGE:");
});

Deno.test("HELP_TEXT contains OPTIONS section", () => {
  assertStringIncludes(HELP_TEXT, "OPTIONS:");
});

Deno.test("HELP_TEXT contains COMMANDS section", () => {
  assertStringIncludes(HELP_TEXT, "COMMANDS:");
});

Deno.test("HELP_TEXT contains EXAMPLES section", () => {
  assertStringIncludes(HELP_TEXT, "EXAMPLES:");
});

Deno.test("HELP_TEXT mentions --help flag", () => {
  assertStringIncludes(HELP_TEXT, "--help");
});

Deno.test("HELP_TEXT mentions --version flag", () => {
  assertStringIncludes(HELP_TEXT, "--version");
});

Deno.test("HELP_TEXT mentions maester command", () => {
  assertStringIncludes(HELP_TEXT, "maester");
});

Deno.test("HELP_TEXT mentions the app name 'Raven'", () => {
  assertStringIncludes(HELP_TEXT, "Raven");
});

// ─── getQuery ────────────────────────────────────────────────────────────────

Deno.test("getQuery - returns empty string when no args provided", () => {
  assertEquals(getQuery([]), "");
});

Deno.test("getQuery - returns single word query", () => {
  assertEquals(getQuery(["hello"]), "hello");
});

Deno.test("getQuery - returns multi-word query joined by spaces", () => {
  assertEquals(getQuery(["hello", "world", "test"]), "hello world test");
});

Deno.test("getQuery - excludes --help flag from query", () => {
  assertEquals(getQuery(["--help", "query"]), "query");
});

Deno.test("getQuery - excludes -v flag from query", () => {
  assertEquals(getQuery(["-v", "music"]), "music");
});

Deno.test("getQuery - numeric args are included in query", () => {
  assertEquals(getQuery(["video", "123"]), "video 123");
});

Deno.test("getQuery - excludes -a flag from query", () => {
  assertEquals(getQuery(["-a", "lofi", "beats"]), "lofi beats");
  assertEquals(getQuery(["lofi", "-a", "beats"]), "lofi beats");
});

Deno.test("getQuery - excludes --audio flag from query", () => {
  assertEquals(getQuery(["--audio", "lofi", "beats"]), "lofi beats");
  assertEquals(getQuery(["lofi", "beats", "--audio"]), "lofi beats");
});

// ─── getPlaybackMode ─────────────────────────────────────────────────────────

Deno.test("getPlaybackMode - returns 'audiovisual' by default when no flags passed", () => {
  assertEquals(getPlaybackMode([]), "audiovisual");
  assertEquals(getPlaybackMode(["search", "query"]), "audiovisual");
});

Deno.test("getPlaybackMode - returns 'audio' when -a flag is passed", () => {
  assertEquals(getPlaybackMode(["-a", "search", "query"]), "audio");
  assertEquals(getPlaybackMode(["search", "query", "-a"]), "audio");
});

Deno.test("getPlaybackMode - returns 'audio' when --audio flag is passed", () => {
  assertEquals(getPlaybackMode(["--audio", "search", "query"]), "audio");
  assertEquals(getPlaybackMode(["search", "query", "--audio"]), "audio");
});

Deno.test("HELP_TEXT mentions -a and --audio flags", () => {
  assertStringIncludes(HELP_TEXT, "-a");
  assertStringIncludes(HELP_TEXT, "--audio");
});

