import { parseArgs } from "@std/cli/parse-args";

export const VERSION = "raven v0.1.0";

export const HELP_TEXT = [
  "Raven — A terminal-native YouTube client",
  "",
  "USAGE:",
  "  raven <search query>",
  "  raven maester",
  "  raven --help",
  "  raven --version",
  "",
  "OPTIONS:",
  "  -h, --help       Show this help message and exit",
  "  -v, --version    Show version number and exit",
  "",
  "COMMANDS:",
  "  maester          Check that yt-dlp, fzf, and mpv are installed",
  "",
  "EXAMPLES:",
  "  raven Odyssey trailer",
  "  raven maester",
].join("\n");

export function getQuery(): string {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "version"],
    alias: { h: "help", v: "version" },
  });
  return args._.join(" ");
}
