import type { PickItem } from "./types.ts";

export async function pickFromList(items: PickItem[]): Promise<number | null> {
  const hasPreview = items.some((i) => i.preview);
  let tempDir: string | undefined;
  const lines: string[] = [];

  if (hasPreview) {
    tempDir = await Deno.makeTempDir({ prefix: "raven-preview-" });
    for (let i = 0; i < items.length; i++) {
      const filePath = `${tempDir}/${i}.txt`;
      await Deno.writeTextFile(filePath, items[i].preview ?? "");
      lines.push(`${items[i].display}\t${filePath}`);
    }
  } else {
    lines.push(...items.map((i) => i.display));
  }

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
      "--preview=cat {2}",
      "--preview-window=right:45%:wrap",
    );
  }

  const cmd = new Deno.Command("fzf", {
    args,
    stdin: "piped",
    stdout: "piped",
    stderr: "inherit",
  });

  let result;
  try {
    result = cmd.spawn();
  } catch (error) {
    if (tempDir) {
      await Deno.remove(tempDir, { recursive: true }).catch(() => {});
    }
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        "fzf is not installed or could not be found in your PATH. Please install fzf and ensure it is available in your PATH. Installation guide: https://github.com/junegunn/fzf#installation",
      );
    }

    throw error;
  }

  const child = result;

  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(lines.join("\n")));
  await writer.close();

  const { stdout, code } = await child.output();
  const pickedLine = new TextDecoder().decode(stdout).trim();

  if (tempDir) await Deno.remove(tempDir, { recursive: true }).catch(() => {});

  if (code !== 0 || pickedLine === "") return null;

  const pickedDisplay = hasPreview ? pickedLine.split("\t")[0] : pickedLine;
  return items.findIndex((i) => i.display === pickedDisplay);
}
