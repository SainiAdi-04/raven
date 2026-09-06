import { parseArgs } from "@std/cli/parse-args";
import type { PlaybackMode } from "../core/types.ts";

export const VERSION = "raven v0.2.0";

export const HELP_TEXT = [
  "Raven — A terminal-native YouTube client with sub-second hybrid search",
  "",
  "USAGE:",
  "  raven [options] <search query | direct target>",
  "  raven maester",
  "  raven --help",
  "  raven --version",
  "",
  "OPTIONS:",
  "  -a, --audio        Enable Audio Mode (suppress video)",
  "  -n, --limit <num>  Maximum number of search results (default: 10)",
  "  -h, --help         Show this help message and exit",
  "  -v, --version      Show version number and exit",
  "",
  "COMMANDS:",
  "  maester            Check that yt-dlp, fzf, and mpv are installed",
  "",
  "EXAMPLES:",
  "  raven Odyssey trailer",
  "  raven https://youtu.be/dQw4w9WgXcQ",
  "  raven -a lofi hip hop",
  "  raven -n 20 synthwave mix",
  "  raven -a https://youtu.be/dQw4w9WgXcQ",
  "  raven maester",
].join("\n");

export function getQuery(rawArgs: string[] = Deno.args): string {
  const args = parseArgs(rawArgs, {
    boolean: ["help", "version", "audio"],
    string: ["limit"],
    alias: { h: "help", v: "version", a: "audio", n: "limit" },
  });
  return args._.join(" ");
}

export function getPlaybackMode(rawArgs: string[] = Deno.args): PlaybackMode {
  const args = parseArgs(rawArgs, {
    boolean: ["help", "version", "audio"],
    string: ["limit"],
    alias: { h: "help", v: "version", a: "audio", n: "limit" },
  });
  return args.audio ? "audio" : "audiovisual";
}

export function getLimit(rawArgs: string[] = Deno.args): number {
  const args = parseArgs(rawArgs, {
    boolean: ["help", "version", "audio"],
    string: ["limit"],
    alias: { h: "help", v: "version", a: "audio", n: "limit" },
  });
  if (args.limit !== undefined && args.limit !== "") {
    const parsed = parseInt(args.limit, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 10;
}

