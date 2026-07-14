import { getQuery } from "./cli/args.ts";
import { resolveStream, searchYoutube } from "./core/ytdlp.ts";
import { pickFromList } from "./core/fzf.ts";
import { playStream } from "./core/mpv.ts";

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

  const titles = results.map((r) => r.title);
  const picked = await pickFromList(titles);

  if (picked === null) {
    console.log("cancelled");
    Deno.exit(0);
  }

  const index = titles.indexOf(picked);
  const chosen = results[index];

  console.log(`Resolving stream for "${chosen.title}"...`);
  const stream = await resolveStream(chosen.id);

  console.log("Playing in mpv...");
  await playStream(stream, chosen.title);
} catch (error) {
  console.error(error);
  Deno.exit(1);
}
