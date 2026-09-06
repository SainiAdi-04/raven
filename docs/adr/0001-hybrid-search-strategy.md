# Hybrid Search Strategy (Native InnerTube with yt-dlp Fallback)

## Context
Searching YouTube previously relied solely on invoking the `yt-dlp` CLI subprocess. Without flat playlist extraction, search queries incurred a ~16.4-second latency penalty; with `--flat-playlist`, latency remained around ~1.96 seconds due to Python process spin-up and network negotiation.

## Decision
Raven uses a direct HTTPS query against YouTube's public InnerTube API (`/youtubei/v1/search`) via native Deno `fetch()` as the primary search engine. If the InnerTube query fails, times out, or returns an unrecognized response structure, Raven emits a diagnostic notice to `stderr` and gracefully falls back to `yt-dlp --flat-playlist`.

## Consequences
- Primary search latency drops from ~16s down to ~200ms with zero added third-party dependencies.
- Codebase footprint remains lightweight and Deno-native.
- Raven gains resilience against upstream schema alterations through the battle-tested `yt-dlp` fallback.
