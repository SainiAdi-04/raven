import type { ResolvedStream, SearchResult } from "./types.ts";
import { formatYtDlpError } from "./error.ts";

export async function searchYoutube(
  query: string,
  limit = 5,
): Promise<SearchResult[]> {
  // Deno.Command("yt-dlp", { args: [`ytsearch${limit}:${query}`, "--dump-json", "--flat-playlist"], stdout: "piped" })
  // decode stdout, split lines, JSON.parse each, map to {id, title}

  const cmd = new Deno.Command("yt-dlp", {
    args: [`ytsearch${limit}:${query}`, "--dump-json", "--flat-playlist"],
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  });

  let result;
  try {
    result = await cmd.output();
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        "yt-dlp not installed — see: https://github.com/yt-dlp/yt-dlp#installation",
      );
    }
    throw error;
  }

  const { stdout, stderr, code } = result;

  if (code !== 0) {
    throw formatYtDlpError(new TextDecoder().decode(stderr), "search");
  }

  const text = new TextDecoder().decode(stdout);

  return text.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line))
    .map((obj) => ({ id: obj.id, title: obj.title }));
}

export async function resolveStream(videoId: string): Promise<ResolvedStream> {
  const url = `https://youtube.com/watch?v=${videoId}`;

  const cmd = new Deno.Command("yt-dlp", {
    args: [
      "-f",
      "bestvideo+bestaudio/best",
      "-g",
      url,
    ],
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  });

  let result;
  try {
    result = await cmd.output();
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        "yt-dlp not installed — see: https://github.com/yt-dlp/yt-dlp#installation and add it to your path.",
      );
    }
    throw error;
  }

  const { stdout, stderr, code } = result;
  if (code !== 0) {
    throw formatYtDlpError(new TextDecoder().decode(stderr), "resolve");
  }

  const lines = new TextDecoder().decode(stdout).trim().split("\n").filter(
    Boolean,
  );

  return lines.length === 1
    ? { videoUrl: lines[0] }
    : { videoUrl: lines[0], audioUrl: lines[1] };
}
