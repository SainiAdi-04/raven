interface DepCheck {
  name: string;
  installHint: string;
}

const DEPS: DepCheck[] = [
  {
    name: "yt-dlp",
    installHint:
      "pip install -U yt-dlp  (or: brew install yt-dlp / see https://github.com/yt-dlp/yt-dlp#installation)",
  },
  {
    name: "fzf",
    installHint:
      "brew install fzf  (or: apt install fzf / see https://github.com/junegunn/fzf#installation)",
  },
  {
    name: "mpv",
    installHint:
      "brew install mpv  (or: apt install mpv / see https://mpv.io/installation/)",
  },
];

async function checkDep(name: string): Promise<boolean> {
  const cmd = new Deno.Command(name, {
    args: ["--version"],
    stdin: "null",
    stdout: "null",
    stderr: "null",
  });

  try {
    const { code } = await cmd.output();
    return code === 0;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return false;
    throw err;
  }
}

export async function runMaester(): Promise<void> {
  console.log("Checking Raven's dependencies...\n");

  let allGood = true;

  for (const dep of DEPS) {
    const found = await checkDep(dep.name);
    if (found) {
      console.log(`✓ ${dep.name} found`);
    } else {
      allGood = false;
      console.log(`✗ ${dep.name} not found`);
      console.log(`  install: ${dep.installHint}`);
    }
  }

  console.log();
  console.log(
    allGood
      ? "All dependencies are ready. Raven is good to go."
      : "Fix the missing dependencies above, then re-run raven maester.",
  );
}
