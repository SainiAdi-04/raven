import { getQuery, getPlaybackMode, getLimit, VERSION, HELP_TEXT } from "./cli/args.ts";
import { resolveStream } from "./core/ytdlp.ts";
import { searchHybrid } from "./core/search.ts";
import { pickFromList } from "./core/fzf.ts";
import { playStream } from "./core/mpv.ts";
import { runMaester } from "./core/maester.ts";
import { isDirectTarget, normalizeDirectTarget } from "./core/direct_target.ts";
import type { SearchResult, PickItem, ResolvedStream, PlaybackMode } from "./core/types.ts";

export interface RavenRuntime {
  search?: (query: string, limit?: number) => Promise<SearchResult[]>;
  pick?: (items: PickItem[]) => Promise<number | null>;
  resolve?: (id: string) => Promise<ResolvedStream> | ResolvedStream;
  play?: (stream: ResolvedStream, title?: string, mode?: PlaybackMode) => Promise<void>;
  maester?: () => Promise<void>;
  log?: (message: string) => void;
  error?: (message: string) => void;
  exit?: (code: number) => void;
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return "unknown length";
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    return `${hours}:${remainingMinutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatViews(count?: number): string {
  if (!count) return "";
  if (Math.abs(count) >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (Math.abs(count) >= 1_000) return `${(count / 1_000).toFixed(0)}K views`;
  return `${count} views`;
}

export function buildPickItems(results: SearchResult[]): PickItem[] {
  return results.map((r) => ({
    display: r.title,
    preview: [
      r.title,
      "",
      r.uploader ?? "unknown uploader",
      `${formatDuration(r.duration)}  ${formatViews(r.views)}`,
      r.date ? `Released on: ${r.date}` : "",
    ].join("\n"),
  }));
}

export async function runRaven(
  args: string[] = Deno.args,
  runtime: RavenRuntime = {},
): Promise<number> {
  const log = runtime.log ?? console.log;
  const error = runtime.error ?? console.error;
  const exit = runtime.exit ?? ((code: number) => Deno.exit(code));
  const search = runtime.search ?? ((query: string, limit?: number) => searchHybrid(query, limit, error));
  const pick = runtime.pick ?? pickFromList;
  const resolve = runtime.resolve ?? resolveStream;
  const play = runtime.play ?? playStream;
  const maester = runtime.maester ?? runMaester;

  if (args.includes("--help") || args.includes("-h")) {
    log(HELP_TEXT);
    exit(0);
    return 0;
  }

  if (args.includes("--version") || args.includes("-v")) {
    log(VERSION);
    exit(0);
    return 0;
  }

  if (args.length > 0 && args[0] === "maester") {
    await maester();
    exit(0);
    return 0;
  }

  try {
    const query = getQuery(args);
    const mode = getPlaybackMode(args);
    const limit = getLimit(args);
    if (!query) {
      error("usage: raven [options] <search query | direct target>");
      exit(1);
      return 1;
    }

    if (isDirectTarget(query)) {
      const stream: ResolvedStream = { videoUrl: normalizeDirectTarget(query) };
      log("Playing in mpv...");
      await play(stream, undefined, mode);
      return 0;
    }

    log(`Searching for "${query}"...`);
    const results = await search(query, limit);

    if (results.length === 0) {
      log("No results found.");
      exit(0);
      return 0;
    }

    const pickItems = buildPickItems(results);
    const pickedIndex = await pick(pickItems);

    if (pickedIndex === null) {
      log("Cancelled.");
      exit(0);
      return 0;
    }

    const chosen = results[pickedIndex];

    log(`Resolving stream for "${chosen.title}"...`);
    const stream = await resolve(chosen.id);

    log("Playing in mpv...");
    await play(stream, chosen.title, mode);
    return 0;
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    exit(1);
    return 1;
  }
}

if (import.meta.main) {
  await runRaven(Deno.args);
}
