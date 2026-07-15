import { getQuery } from "./cli/args.ts";
import { resolveStream, searchYoutube } from "./core/ytdlp.ts";
import { pickFromList } from "./core/fzf.ts";
import { playStream } from "./core/mpv.ts";

function formatDuration(seconds?: number): string {
  if (!seconds) return "unknown length";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatViews(count?: number): string {
  if (!count) return "";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K views`;
  return `${count} views`;
}

try {
  const query = getQuery();
  if (!query) {
    console.error("usage: mov <search query>");
    Deno.exit(1);
  }

  console.log(`Searching for "${query}"...`);
  const results = await searchYoutube(query);

  if (results.length === 0) {
    console.log("No results found.");
    Deno.exit(0);
  }

  const pickItems = results.map((r) => ({
    display: r.title,
    preview: [
      r.title,
      "",
      r.uploader ?? "unknown uploader",
      `${formatDuration(r.duration)}  ${formatViews(r.views)}`,
    ].join("\n"),
  }));

  const pickedIndex = await pickFromList(pickItems);

  if (pickedIndex === null) {
    console.log("Cancelled.");
    Deno.exit(0);
  }

  const chosen = results[pickedIndex];

  console.log(`Resolving stream for "${chosen.title}"...`);
  const stream = await resolveStream(chosen.id);

  console.log("Playing in mpv...");
  await playStream(stream, chosen.title);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  Deno.exit(1);
}
