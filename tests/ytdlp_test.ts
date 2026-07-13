import { searchYoutube, resolveStream } from "../src/core/ytdlp.ts";

const results = await searchYoutube("blender studio", 3);
console.log(results);

const stream = await resolveStream(results[0].id);
console.log(stream);