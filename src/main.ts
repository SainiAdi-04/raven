import { getQuery } from "./cli/args.ts";
import { searchYoutube } from "./core/ytdlp.ts";
import { pickFromList } from "./core/fzf.ts";

const query = getQuery();
const results = await searchYoutube(query);
const titles = results.map((r) => r.title);
const picked = await pickFromList(titles);

if (picked === null) {
  console.log("cancelled");
  Deno.exit(0);
}

const chosen = results.find((r) => r.title === picked)!;
console.log("you picked:", chosen);
