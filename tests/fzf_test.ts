import { pickFromList } from "../src/core/fzf.ts";

const picked = await pickFromList(["apple", "banana", "cherry"]);
console.log("picked:", picked);