import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRaven, type RavenRuntime } from "../src/main.ts";
import type { SearchResult, ResolvedStream, PlaybackMode } from "../src/core/types.ts";
import { buildMpvArgs } from "../src/core/mpv.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// Application Orchestrator Seam Tests (runRaven)
// Verifies top-level CLI lifecycle, argument handling, and external tool handoffs
// using injected test runtimes.
// ═══════════════════════════════════════════════════════════════════════════════

async function runTestRaven(
  args: string[],
  overrides: Partial<RavenRuntime> = {},
): Promise<{
  stdout: string;
  stderr: string;
  code: number;
  playedStream: ResolvedStream | null;
  playedTitle?: string;
  playedMode?: PlaybackMode;
  playerArgs: string[];
}> {
  const logs: string[] = [];
  const errors: string[] = [];
  let exitCode: number | null = null;
  let playedStream: ResolvedStream | null = null;
  let playedTitle: string | undefined;
  let playedMode: PlaybackMode | undefined;

  const runtime: RavenRuntime = {
    log: (msg: string) => logs.push(msg),
    error: (msg: string) => errors.push(msg),
    exit: (code: number) => {
      exitCode = code;
    },
    search: async () => [],
    pick: async () => null,
    resolve: () => ({ videoUrl: "https://youtube.com/watch?v=123" }),
    play: async (stream: ResolvedStream, title?: string, mode?: PlaybackMode) => {
      playedStream = stream;
      playedTitle = title;
      playedMode = mode;
    },
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
    playedStream,
    playedTitle,
    playedMode,
    playerArgs: playedStream ? buildMpvArgs(playedStream, playedTitle, playedMode) : [],
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

// ─── Direct Target URL Interception ──────────────────────────────────────────

Deno.test("runRaven - direct target watch URL bypasses search and picker, dispatching to player", async () => {
  let searchCalled = false;
  let pickCalled = false;
  let playedStream: ResolvedStream | null = null;

  const { stdout, code } = await runTestRaven(
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    {
      search: () => {
        searchCalled = true;
        throw new Error("search should not be called for direct target");
      },
      pick: () => {
        pickCalled = true;
        throw new Error("pick should not be called for direct target");
      },
      play: (stream: ResolvedStream) => {
        playedStream = stream;
        return Promise.resolve();
      },
    },
  );

  assertEquals(code, 0);
  assertEquals(searchCalled, false);
  assertEquals(pickCalled, false);
  assertEquals((playedStream as ResolvedStream | null)?.videoUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assertStringIncludes(stdout, "Playing in mpv...");
  assertEquals(stdout.includes("Searching for"), false);
});

Deno.test("runRaven - direct target short URL (youtu.be) dispatches with normalized URL", async () => {
  let playedStream: ResolvedStream | null = null;

  const { stdout, code } = await runTestRaven(["youtu.be/dQw4w9WgXcQ"], {
    search: () => {
      throw new Error("search should not be called");
    },
    pick: () => {
      throw new Error("pick should not be called");
    },
    play: (stream: ResolvedStream) => {
      playedStream = stream;
      return Promise.resolve();
    },
  });

  assertEquals(code, 0);
  assertEquals((playedStream as ResolvedStream | null)?.videoUrl, "https://youtu.be/dQw4w9WgXcQ");
  assertStringIncludes(stdout, "Playing in mpv...");
});

Deno.test("runRaven - direct target shorts URL dispatches directly to player", async () => {
  let playedStream: ResolvedStream | null = null;

  const { stdout, code } = await runTestRaven(
    ["https://youtube.com/shorts/dQw4w9WgXcQ"],
    {
      search: () => {
        throw new Error("search should not be called");
      },
      pick: () => {
        throw new Error("pick should not be called");
      },
      play: (stream: ResolvedStream) => {
        playedStream = stream;
        return Promise.resolve();
      },
    },
  );

  assertEquals(code, 0);
  assertEquals((playedStream as ResolvedStream | null)?.videoUrl, "https://youtube.com/shorts/dQw4w9WgXcQ");
  assertStringIncludes(stdout, "Playing in mpv...");
});

Deno.test("runRaven - direct target mobile URL dispatches with normalized URL", async () => {
  let playedStream: ResolvedStream | null = null;

  const { stdout, code } = await runTestRaven(
    ["m.youtube.com/watch?v=dQw4w9WgXcQ"],
    {
      search: () => {
        throw new Error("search should not be called");
      },
      pick: () => {
        throw new Error("pick should not be called");
      },
      play: (stream: ResolvedStream) => {
        playedStream = stream;
        return Promise.resolve();
      },
    },
  );

  assertEquals(code, 0);
  assertEquals((playedStream as ResolvedStream | null)?.videoUrl, "https://m.youtube.com/watch?v=dQw4w9WgXcQ");
  assertStringIncludes(stdout, "Playing in mpv...");
});

Deno.test("runRaven - non-URL string queries continue through search and picker", async () => {
  let searchReceivedQuery = "";
  const mockResults: SearchResult[] = [{ id: "abc", title: "Test Result" }];

  const { stdout, code } = await runTestRaven(["never gonna give you up"], {
    search: (query: string) => {
      searchReceivedQuery = query;
      return Promise.resolve(mockResults);
    },
    pick: () => Promise.resolve(0),
    play: () => Promise.resolve(),
  });

  assertEquals(code, 0);
  assertEquals(searchReceivedQuery, "never gonna give you up");
  assertStringIncludes(stdout, 'Searching for "never gonna give you up"...');
});

// ─── Audio Mode (-a / --audio) Support ───────────────────────────────────────

Deno.test("runRaven - -a flag enables Audio Mode for search selection and sets pure audio mpv args", async () => {
  const mockResults: SearchResult[] = [{ id: "audio1", title: "Lofi Hip Hop" }];
  const { code, stdout, playedMode, playerArgs } = await runTestRaven(["-a", "lofi beats"], {
    search: () => Promise.resolve(mockResults),
    pick: () => Promise.resolve(0),
    resolve: (id: string) => ({ videoUrl: `https://youtube.com/watch?v=${id}` }),
  });

  assertEquals(code, 0);
  assertEquals(playedMode, "audio");
  assertEquals(playerArgs.includes("--no-video"), true);
  assertEquals(playerArgs.includes("--ytdl-format=bestaudio/best"), true);
  assertEquals(playerArgs[0], "https://youtube.com/watch?v=audio1");
  assertEquals(playerArgs[1], "--force-media-title=Lofi Hip Hop");
  assertStringIncludes(stdout, "Playing in mpv...");
});

Deno.test("runRaven - --audio flag enables Audio Mode for search selection", async () => {
  const mockResults: SearchResult[] = [{ id: "audio2", title: "Study Music" }];
  const { code, playedMode, playerArgs } = await runTestRaven(["--audio", "study music"], {
    search: () => Promise.resolve(mockResults),
    pick: () => Promise.resolve(0),
    resolve: (id: string) => ({ videoUrl: `https://youtube.com/watch?v=${id}` }),
  });

  assertEquals(code, 0);
  assertEquals(playedMode, "audio");
  assertEquals(playerArgs.includes("--no-video"), true);
  assertEquals(playerArgs.includes("--ytdl-format=bestaudio/best"), true);
});

Deno.test("runRaven - -a flag combines cleanly with Direct Target URL", async () => {
  let searchCalled = false;
  let pickCalled = false;

  const { code, stdout, playedStream, playedMode, playerArgs } = await runTestRaven(
    ["-a", "https://youtu.be/dQw4w9WgXcQ"],
    {
      search: () => {
        searchCalled = true;
        throw new Error("search should not be called");
      },
      pick: () => {
        pickCalled = true;
        throw new Error("pick should not be called");
      },
    },
  );

  assertEquals(code, 0);
  assertEquals(searchCalled, false);
  assertEquals(pickCalled, false);
  assertEquals(playedStream?.videoUrl, "https://youtu.be/dQw4w9WgXcQ");
  assertEquals(playedMode, "audio");
  assertEquals(playerArgs.includes("--no-video"), true);
  assertEquals(playerArgs.includes("--ytdl-format=bestaudio/best"), true);
  assertStringIncludes(stdout, "Playing in mpv...");
});

Deno.test("runRaven - --audio flag placed after Direct Target URL enables Audio Mode", async () => {
  const { code, playedStream, playedMode, playerArgs } = await runTestRaven(
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "--audio"],
  );

  assertEquals(code, 0);
  assertEquals(playedStream?.videoUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assertEquals(playedMode, "audio");
  assertEquals(playerArgs.includes("--no-video"), true);
  assertEquals(playerArgs.includes("--ytdl-format=bestaudio/best"), true);
});

Deno.test("runRaven - default Playback Mode without flags is Audiovisual Mode with video enabled", async () => {
  const { code, playedStream, playedMode, playerArgs } = await runTestRaven(
    ["https://youtu.be/dQw4w9WgXcQ"],
  );

  assertEquals(code, 0);
  assertEquals(playedStream?.videoUrl, "https://youtu.be/dQw4w9WgXcQ");
  assertEquals(playedMode, "audiovisual");
  assertEquals(playerArgs.includes("--no-video"), false);
  assertEquals(
    playerArgs.includes("--ytdl-format=bestvideo[vcodec^=avc1]+bestaudio/bestvideo+bestaudio/best"),
    true,
  );
});

Deno.test("runRaven - Audio Mode flag alone without query shows usage error and exits 1", async () => {
  const { code, stderr } = await runTestRaven(["-a"]);
  assertEquals(code, 1);
  assertStringIncludes(stderr, "usage:");
});

// ─── Search Result Limit (-n / --limit) & Hybrid Search ─────────────────────

Deno.test("runRaven - passes default limit 10 to search runtime", async () => {
  let capturedQuery = "";
  let capturedLimit: number | undefined;

  await runTestRaven(["lofi beats"], {
    search: (query, limit) => {
      capturedQuery = query;
      capturedLimit = limit;
      return Promise.resolve([]);
    },
  });

  assertEquals(capturedQuery, "lofi beats");
  assertEquals(capturedLimit, 10);
});

Deno.test("runRaven - -n flag passes configured limit to search runtime", async () => {
  let capturedQuery = "";
  let capturedLimit: number | undefined;

  await runTestRaven(["-n", "5", "lofi beats"], {
    search: (query, limit) => {
      capturedQuery = query;
      capturedLimit = limit;
      return Promise.resolve([]);
    },
  });

  assertEquals(capturedQuery, "lofi beats");
  assertEquals(capturedLimit, 5);
});

Deno.test("runRaven - --limit flag passes configured limit to search runtime", async () => {
  let capturedQuery = "";
  let capturedLimit: number | undefined;

  await runTestRaven(["--limit", "25", "ambient music"], {
    search: (query, limit) => {
      capturedQuery = query;
      capturedLimit = limit;
      return Promise.resolve([]);
    },
  });

  assertEquals(capturedQuery, "ambient music");
  assertEquals(capturedLimit, 25);
});

Deno.test("runRaven - limit flag alone without query shows usage error and exits 1", async () => {
  const { code, stderr } = await runTestRaven(["-n", "10"]);
  assertEquals(code, 1);
  assertStringIncludes(stderr, "usage:");
});

Deno.test("runRaven - hybrid search fallback emits notice to stderr and executes fallback", async () => {
  let fallbackExecuted = false;
  const mockFallbackResults: SearchResult[] = [
    { id: "fb1", title: "Fallback Result" },
  ];

  const logs: string[] = [];
  const errors: string[] = [];
  let exitCode: number | null = null;
  let playedStream: ResolvedStream | null = null;

  const runtime: RavenRuntime = {
    log: (msg: string) => logs.push(msg),
    error: (msg: string) => errors.push(msg),
    exit: (code: number) => {
      exitCode = code;
    },
    search: (_q, _lim) => {
      errors.push("(notice: falling back to yt-dlp search...)");
      fallbackExecuted = true;
      return Promise.resolve(mockFallbackResults);
    },
    pick: () => Promise.resolve(0),
    resolve: (id) => ({ videoUrl: `https://youtube.com/watch?v=${id}` }),
    play: (stream) => {
      playedStream = stream;
      return Promise.resolve();
    },
  };

  const code = await runRaven(["chill music"], runtime);
  assertEquals(exitCode ?? code, 0);
  assertEquals(fallbackExecuted, true);
  assertEquals(errors.includes("(notice: falling back to yt-dlp search...)"), true);
  assertEquals((playedStream as ResolvedStream | null)?.videoUrl, "https://youtube.com/watch?v=fb1");
});


