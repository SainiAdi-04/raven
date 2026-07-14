export async function pickFromList(items: string[]): Promise<string | null> {
  // spawn fzf with stdin: "piped", stdout: "piped"
  // write items.join("\n") to stdin, close it
  // read stdout, trim, return null if empty (user pressed Esc)

  const cmd = new Deno.Command("fzf", {
    stdin: "piped",
    stdout: "piped",
    stderr: "inherit",
  });

  let result;
  try {
    result = cmd.spawn();
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error("fzf is not installed or could not be found in your PATH. Please install fzf and ensure it is available in your PATH. Installation guide: https://github.com/junegunn/fzf#installation");
    }
    throw error;
  }

  const child = result;

  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(items.join("\n")));
  await writer.close();

  const { stdout, code } = await child.output();
  const picked = new TextDecoder().decode(stdout).trim();

  if (code !== 0 || picked === "") {
    return null;
  }

  return picked;
}
