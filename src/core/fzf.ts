import type { PickItem } from "./types.ts";

export function formatPreviewForFzf(preview?: string): string {
  if (!preview) return "";
  return preview
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n")
    .replaceAll("\t", "\\t");
}

export function buildFzfLines(items: PickItem[], hasPreview: boolean): string[] {
  if (hasPreview) {
    return items.map((item) => `${item.display}\t${formatPreviewForFzf(item.preview)}`);
  }
  return items.map((item) => item.display);
}

export function buildFzfArgs(hasPreview: boolean): string[] {
  const args = [
    "--height=90%",
    "--layout=reverse",
    "--border=rounded",
    "--prompt=› ",
    "--pointer=▶",
    "--marker=✓",
    "--color=fg:#d0d0d0,bg:-1,hl:#5fafff,fg+:#ffffff,bg+:#303030,hl+:#5fd7ff," +
    "info:#87af87,prompt:#ff5faf,pointer:#af87ff,marker:#87ff87,border:#444444",
  ];

  if (hasPreview) {
    args.push(
      "--delimiter=\t",
      "--with-nth=1",
      `--preview=printf '%b\\n' "{2}"`,
      "--preview-window=right:45%:wrap",
    );
  }

  return args;
}

export async function pickFromList(items: PickItem[]): Promise<number | null> {
  const hasPreview = items.some((i) => i.preview);
  const lines = buildFzfLines(items, hasPreview);
  const args = buildFzfArgs(hasPreview);

  const cmd = new Deno.Command("fzf", {
    args,
    stdin: "piped",
    stdout: "piped",
    stderr: "inherit",
  });

  let child;
  try {
    child = cmd.spawn();
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        "fzf is not installed or could not be found in your PATH. Please install fzf and ensure it is available in your PATH. Installation guide: https://github.com/junegunn/fzf#installation",
      );
    }

    throw error;
  }

  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(lines.join("\n")));
  await writer.close();

  const { stdout, code } = await child.output();
  const pickedLine = new TextDecoder().decode(stdout).trim();

  if (code !== 0 || pickedLine === "") return null;

  const pickedDisplay = hasPreview ? pickedLine.split("\t")[0] : pickedLine;
  return items.findIndex((i) => i.display === pickedDisplay);
}
