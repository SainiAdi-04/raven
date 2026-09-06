import type { ResolvedStream, SearchResult } from "./types.ts";
import { formatYtDlpError } from "./error.ts";

export async function searchYoutube(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
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
    .map((obj): SearchResult => ({
      id: obj.id,
      title: obj.title,
      uploader: obj.uploader ?? obj.channel,
      duration: obj.duration,
      views: obj.view_count,
      date: obj.upload_date ? `${obj.upload_date.slice(6, 8)}-${obj.upload_date.slice(4, 6)}-${obj.upload_date.slice(0, 4)}` : undefined,
    }));
}

export function resolveStream(videoId: string): ResolvedStream {
  return { videoUrl: `https://youtube.com/watch?v=${videoId}` };
}
