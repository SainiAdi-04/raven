import type { ResolvedStream, PlaybackMode } from "./types.ts";

export function buildMpvArgs(
  stream: ResolvedStream,
  title?: string,
  mode: PlaybackMode = "audiovisual",
): string[] {
  const args = [
    stream.videoUrl,
    `--force-media-title=${title ?? "Now playing"}`,
    "--msg-level=all=warn",
  ];

  if (mode === "audio") {
    args.push("--no-video");
    args.push("--ytdl-format=bestaudio/best");
  } else {
    args.push("--ytdl-format=bestvideo[vcodec^=avc1]+bestaudio/bestvideo+bestaudio/best");
  }

  return args;
}

export async function playStream(
  stream: ResolvedStream,
  title?: string,
  mode: PlaybackMode = "audiovisual",
): Promise<void> {
  const args = buildMpvArgs(stream, title, mode);

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
