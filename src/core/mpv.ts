import type { ResolvedStream } from "./types.ts";

export async function playStream(
  stream: ResolvedStream,
  title?: string,
): Promise<void> {
  const args = [
    stream.videoUrl,
    `--force-media-title=${title ?? "Now playing"}`,
    "--msg-level=all=warn",
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

  let child: Deno.ChildProcess;

  try {
    child = cmd.spawn();
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        "mpv is not installed or could not be found in your PATH. Please install mpv and ensure it is available in your PATH. Installation guide: https://mpv.io/installation/",
      );
    }

    throw error;
  }

  const status = await child.status;

  if (!status.success) {
    throw new Error(`mpv exited with code ${status.code}`);
  }
}
