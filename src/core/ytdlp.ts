import type { ResolvedStream, SearchResult } from "./types.ts";

export async function searchYoutube(
  query: string,
  limit = 5,
): Promise<SearchResult[]> {
  // Deno.Command("yt-dlp", { args: [`ytsearch${limit}:${query}`, "--dump-json", "--flat-playlist"], stdout: "piped" })
  // decode stdout, split lines, JSON.parse each, map to {id, title}

  const cmd = new Deno.Command("yt-dlp", {
    args: [`ytsearch${limit}:${query}`, "--dump-json", "--flat-playlist"],
    stdout: "piped",
    stderr: "piped",
  });

  const { stdout, stderr, code } = await cmd.output();

  if (code !== 0) {
    throw new Error(
      `yt-dlp search failed: ${new TextDecoder().decode(stderr)}`,
    );
  }

  const text = new TextDecoder().decode(stdout);

  return text.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line))
    .map((obj) => ({ id: obj.id, title: obj.title }));
}

export async function resolveStream(videoId: string): Promise<ResolvedStream> {
  const url = `https://youtube.com/watch?v=${videoId}`;

  const cmd = new Deno.Command("yt-dlp", {
    args: ["-g", url],
    stdout: "piped",
    stdin: "piped",
  });

  const { stdout, stderr, code } = await cmd.output();
  if (code !== 0) {
    throw new Error(
      `yt-dlp resolve failed: ${new TextDecoder().decode(stderr)}`,
    );
  }

  const lines = new TextDecoder().decode(stdout).trim().split("\n").filter(
    Boolean,
  );

  if (lines.length === 1) {
    return { videoUrl: lines[0] };
  }

  return { videoUrl: lines[0], audioUrl: lines[1] };
}
