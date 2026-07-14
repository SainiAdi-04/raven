import type { ResolvedStream } from "./types.ts";

export async function playStream(
  stream: ResolvedStream,
  title?: string,
): Promise<void> {
  const args = [
    stream.videoUrl,
    `--force-media-title=${title ?? "Now playing"}`,
    "--osd-level=0",
  ];

  if (stream.audioUrl) {
    args.push(`--audio-file=${stream.audioUrl}`);
  }

  const cmd = new Deno.Command("mpv", {
    args,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const child = cmd.spawn();
  const status = await child.status;

  if (!status.success) {
    throw new Error(`mpv exited with code ${status.code}`);
  }
}
