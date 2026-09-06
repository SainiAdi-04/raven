import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRaven, type RavenRuntime } from "../src/main.ts";
import type { SearchResult, ResolvedStream } from "../src/core/types.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// Application Orchestrator Seam Tests (runRaven)
// Verifies top-level CLI lifecycle, argument handling, and external tool handoffs
// using injected test runtimes.
// ═══════════════════════════════════════════════════════════════════════════════

async function runTestRaven(
  args: string[],
  overrides: Partial<RavenRuntime> = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
  const logs: string[] = [];
  const errors: string[] = [];
  let exitCode: number | null = null;

  const runtime: RavenRuntime = {
    log: (msg: string) => logs.push(msg),
    error: (msg: string) => errors.push(msg),
    exit: (code: number) => {
      exitCode = code;
    },
    search: async () => [],
    pick: async () => null,
    resolve: () => ({ videoUrl: "https://youtube.com/watch?v=123" }),
    play: async () => {},
    maester: async () => {
      logs.push("Checking external dependencies...");
      logs.push("  yt-dlp: installed");
      logs.push("  fzf: installed");
      logs.push("  mpv: installed");
    },
    ...overrides,
  };

  const code = await runRaven(args, runtime);
  return {
    stdout: logs.join("\n"),
    stderr: errors.join("\n"),
    code: exitCode ?? code,
  };
}

// ─── --help flag ─────────────────────────────────────────────────────────────

Deno.test("CLI --help flag shows help text and exits 0", async () => {
  const { stdout, code } = await runTestRaven(["--help"]);
  assertEquals(code, 0);
  assertStringIncludes(stdout, "Raven");
  assertStringIncludes(stdout, "USAGE:");
  assertStringIncludes(stdout, "OPTIONS:");
});

Deno.test("CLI -h flag shows help text and exits 0", async () => {
  const { stdout, code } = await runTestRaven(["-h"]);
  assertEquals(code, 0);
  assertStringIncludes(stdout, "Raven");
});

// ─── --version flag ──────────────────────────────────────────────────────────

Deno.test("CLI --version flag shows version and exits 0", async () => {
  const { stdout, code } = await runTestRaven(["--version"]);
  assertEquals(code, 0);
  assertStringIncludes(stdout, "raven");
  assertStringIncludes(stdout, "v0.");
});

Deno.test("CLI -v flag shows version and exits 0", async () => {
  const { stdout, code } = await runTestRaven(["-v"]);
  assertEquals(code, 0);
  assertStringIncludes(stdout, "raven");
});

// ─── No arguments ────────────────────────────────────────────────────────────

Deno.test("CLI with no arguments shows usage error and exits 1", async () => {
  const { stderr, code } = await runTestRaven([]);
  assertEquals(code, 1);
  assertStringIncludes(stderr, "usage:");
});

// ─── Flag precedence ─────────────────────────────────────────────────────────

Deno.test("CLI --help takes precedence over --version (listed first)", async () => {
  const { stdout, code } = await runTestRaven(["--help", "--version"]);
  assertEquals(code, 0);
  assertStringIncludes(stdout, "USAGE:");
});

Deno.test("CLI --version before --help still shows help (order in code matters, not args)", async () => {
  const { stdout, code } = await runTestRaven(["--version", "--help"]);
  assertEquals(code, 0);
  assertStringIncludes(stdout, "USAGE:");
});

// ─── maester command ─────────────────────────────────────────────────────────

Deno.test("CLI 'maester' command runs dependency check", async () => {
  const { stdout, code } = await runTestRaven(["maester"]);
  assertEquals(code, 0);
  assertStringIncludes(stdout, "Checking");
  const hasYtdlp = stdout.includes("yt-dlp");
  const hasFzf = stdout.includes("fzf");
  const hasMpv = stdout.includes("mpv");
  assertEquals(hasYtdlp, true);
  assertEquals(hasFzf, true);
  assertEquals(hasMpv, true);
});

// ─── Edge cases with flag-like queries ───────────────────────────────────────

Deno.test("CLI -h flag with additional args still shows help (short-circuit)", async () => {
  const { stdout, code } = await runTestRaven(["-h", "some", "query"]);
  assertEquals(code, 0);
  assertStringIncludes(stdout, "USAGE:");
});

Deno.test("CLI --help anywhere in args still triggers help", async () => {
  const { stdout, code } = await runTestRaven(["search", "query", "--help"]);
  assertEquals(code, 0);
  assertStringIncludes(stdout, "USAGE:");
});

// ─── Full workflow orchestrator lifecycle ────────────────────────────────────

Deno.test("runRaven - search with no results logs message and exits 0", async () => {
  const { stdout, code } = await runTestRaven(["nonexistent search query"], {
    search: async () => [],
  });
  assertEquals(code, 0);
  assertStringIncludes(stdout, "No results found.");
});

Deno.test("runRaven - user cancels picker logs Cancelled and exits 0", async () => {
  const mockResults: SearchResult[] = [
    { id: "1", title: "Video One" },
  ];
  const { stdout, code } = await runTestRaven(["video query"], {
    search: async () => mockResults,
    pick: async () => null,
  });
  assertEquals(code, 0);
  assertStringIncludes(stdout, "Cancelled.");
});

Deno.test("runRaven - successful selection resolves stream and plays in mpv", async () => {
  const mockResults: SearchResult[] = [
    { id: "vid123", title: "Selected Video" },
  ];
  let resolvedId = "";
  let playedTitle = "";
  let playedStream: ResolvedStream | null = null;

  const { stdout, code } = await runTestRaven(["music"], {
    search: async () => mockResults,
    pick: async () => 0,
    resolve: (id: string) => {
      resolvedId = id;
      return { videoUrl: `https://youtube.com/watch?v=${id}` };
    },
    play: async (stream: ResolvedStream, title?: string) => {
      playedStream = stream;
      playedTitle = title ?? "";
    },
  });

  assertEquals(code, 0);
  assertEquals(resolvedId, "vid123");
  assertEquals(playedTitle, "Selected Video");
  assertEquals((playedStream as ResolvedStream | null)?.videoUrl, "https://youtube.com/watch?v=vid123");
  assertStringIncludes(stdout, "Playing in mpv...");
});

Deno.test("runRaven - handles runtime exceptions gracefully with exit 1", async () => {
  const { stderr, code } = await runTestRaven(["boom"], {
    search: () => {
      throw new Error("Network connection dropped");
    },
  });
  assertEquals(code, 1);
  assertStringIncludes(stderr, "Network connection dropped");
});
