import { parseArgs } from "@std/cli/parse-args";

export function getQuery(): string {
  const args = parseArgs(Deno.args);
  return args._.join(" ");
}
