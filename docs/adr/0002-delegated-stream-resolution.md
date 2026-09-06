# Delegated Stream Resolution via mpv ytdl_hook

## Context
Raven previously invoked `yt-dlp -g` to extract direct CDN media URLs before handing them to `mpv`. YouTube's anti-bot measures frequently invalidate raw CDN URLs with HTTP 403 Forbidden errors when requested outside of their original session context or across separate processes.

## Decision
Raven passes the canonical YouTube watch URL directly to `mpv` and delegates media format negotiation and stream acquisition to `mpv`'s built-in `ytdl_hook`.

## Consequences
- Eliminates 403 Forbidden playback errors caused by stale or mismatched CDN signatures.
- Simplifies Raven's stream resolution logic into constructing canonical media targets.
- Handoff latency is governed by `mpv`'s background stream initialization.
