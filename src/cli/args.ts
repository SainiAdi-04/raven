import { parseArgs } from "@std/cli/parse-args";
import type { PlaybackMode } from "../core/types.ts";

export const VERSION = "raven v0.1.0";

export const HELP_TEXT = [
  "Raven — A terminal-native YouTube client",
  "",
  "USAGE:",
  "  raven [options] <search query | direct target>",
  "  raven maester",
  "  raven --help",
  "  raven --version",
  "",
  "OPTIONS:",
  "  -a, --audio      Enable Audio Mode (suppress video)",
  "  -h, --help       Show this help message and exit",
  "  -v, --version    Show version number and exit",
  "",
  "COMMANDS:",
  "  maester          Check that yt-dlp, fzf, and mpv are installed",
  "",
  "EXAMPLES:",
  "  raven Odyssey trailer",
  "  raven https://youtu.be/dQw4w9WgXcQ",
  "  raven -a lofi hip hop",
  "  raven -a https://youtu.be/dQw4w9WgXcQ",
  "  raven maester",
].join("\n");

export function getQuery(rawArgs: string[] = Deno.args): string {
  const args = parseArgs(rawArgs, {
    boolean: ["help", "version", "audio"],
    alias: { h: "help", v: "version", a: "audio" },
  });
  return args._.join(" ");
}

export function getPlaybackMode(rawArgs: string[] = Deno.args): PlaybackMode {
  const args = parseArgs(rawArgs, {
    boolean: ["help", "version", "audio"],
    alias: { h: "help", v: "version", a: "audio" },
  });
  return args.audio ? "audio" : "audiovisual";
}

