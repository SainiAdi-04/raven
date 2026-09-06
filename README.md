# 🦅 Raven

> *"When you play the algorithm, you win or you get recommended to."*

Raven is a terminal-native YouTube client. You send it a query, it fetches exactly that — no ads, no autoplay, no recommended sidebar, no algorithm deciding what you watch next. You ask, it answers. That's the whole deal.

```
raven Odyssey trailer
```

That's it. That's the interface.

---

## 📺 See it in action

Search, pick, watch — no ads, no autoplay, no algorithm in between.

![Raven searching and playing a video](./demo/video.gif)

---

## 🏰 Why send a Raven?

- **It lives in your terminal.** No browser tab, no bookmarks bar, no seventeen other tabs pulling your attention. Just you and what you asked for.
- **Sub-second hybrid search.** Searches query YouTube's InnerTube API directly in ~200ms using native Deno `fetch()`, with automatic fallback to `yt-dlp` for maximum reliability. No 15-second lag.
- **No ads. No autoplay. No algorithm.** Raven doesn't know what "engagement" means. It fetches your search, you pick a result, it plays, it ends. Nothing queues up after.
- **Audio Mode & Direct Target playback.** Listen to audio-only streams with `-a` or pass a Direct Target YouTube watch URL directly to start playing without searching.
- **Watch only what you came for.** No homepage, no Shorts, no "recommended for you." The absence of a feed is the feature.
- **Built to grow.** Today it's search-and-play. Future versions can extend into offline playlists, a personal audio queue, and more — think of it as the first outpost, not the whole kingdom.

---

## 🗺️ The Known World (supported platforms)

| Platform | Status |
|---|---|
| macOS | ✅ Supported |
| Linux | ✅ Supported |
| Windows | 🔜 Coming in a later version |

Playback currently uses `mpv`. Support for other media players may be added in future versions.

---

## ⚔️ Raising your Raven (installation)

### 1. Install the three ravens you'll need

Raven relies on three battle-tested tools to do the actual work of finding, resolving, and playing video:

**macOS** (via [Homebrew](https://brew.sh)):
```bash
brew install yt-dlp fzf mpv
```

**Linux** (Debian/Ubuntu):
```bash
sudo apt update
sudo apt install fzf mpv
pip install -U yt-dlp
```

**Linux** (Arch):
```bash
sudo pacman -S yt-dlp fzf mpv
```

### 2. Download the Raven binary

Grab the latest release for your platform from the [Releases page](../../releases):

```bash
# Linux
curl -L https://github.com/SainiAdi-04/raven/releases/latest/download/raven-linux -o raven

# macOS (Apple Silicon)
curl -L https://github.com/SainiAdi-04/raven/releases/latest/download/raven-macos-arm -o raven

# macOS (Intel)
curl -L https://github.com/SainiAdi-04/raven/releases/latest/download/raven-macos-intel -o raven

```

### 3. Make it executable and add it to your path

```bash
chmod +x raven
sudo mv raven /usr/local/bin/raven
```

`/usr/local/bin` is on the default `$PATH` for most macOS and Linux shells. If `raven` isn't found after this, check your path with `echo $PATH` and move the binary into any directory listed there instead — or add `/usr/local/bin` to your shell config (`~/.zshrc` or `~/.bashrc`):

```bash
export PATH="/usr/local/bin:$PATH"
```

Then reload your shell:
```bash
source ~/.zshrc   # or ~/.bashrc
```

### 4. Consult the Maester

Before your first flight, make sure everything's in order:

```bash
raven maester
```

This checks that `yt-dlp`, `fzf`, and `mpv` are all reachable, and tells you exactly what to install if anything's missing.

![raven maester checking dependencies](./demo/maester.gif)

### 5. Build from source (optional)

If you have [Deno](https://deno.land) installed, you can run or compile Raven directly:

```bash
# Run in development
deno task dev <search query>

# Compile standalone executable
deno task compile
```

---

## 🦅 Usage

### Interactive Search & Playback

Supply a Search Query to discover YouTube content:

```bash
raven Odyssey trailer
```

1. **Sub-second Hybrid Search**: Raven queries YouTube's InnerTube API directly (~200ms) with automatic, zero-downtime fallback to `yt-dlp`.
2. **Interactive Picker**: Candidate Search Results are presented in an interactive fuzzy-selection interface (`fzf`). Filter using arrow keys or typing.
3. **Player Handoff**: Once selected, the Media Stream resolves and begins playback in `mpv`. Press `q` in `mpv` to stop playback.

### Direct Target URL Playback

Supply a specific YouTube watch URL, short URL (`youtu.be`), or YouTube Shorts URL directly to start playback immediately, bypassing search and the interactive Picker:

```bash
# Standard watch URL
raven https://www.youtube.com/watch?v=dQw4w9WgXcQ

# Short URL
raven youtu.be/dQw4w9WgXcQ

# YouTube Shorts URL
raven https://youtube.com/shorts/dQw4w9WgXcQ
```

Direct Target playback works seamlessly with Audio Mode as well:

```bash
raven -a https://youtu.be/dQw4w9WgXcQ
```

### Audio Mode (`-a`, `--audio`)

Enable Audio Mode to suppress video decoding and window rendering in favor of a lightweight audio stream (delegated to `mpv` via `--no-video` and optimal audio stream formats). Perfect for background music, podcasts, discussions, and ambient audio:

```bash
# Search and play in Audio Mode
raven -a lofi hip hop

# Long flag syntax
raven --audio "deep focus ambient"
```

### Configurable Search Limits (`-n`, `--limit`)

Control the maximum number of Search Results returned by the search engine (default: 10):

```bash
# Fetch up to 20 Search Results
raven -n 20 synthwave mix

# Long flag syntax
raven --limit 5 classical piano
```

### Sub-Second Fast Search (Hybrid Engine)

Raven uses an intelligent hybrid search architecture:
- **Primary Engine**: Direct HTTPS queries against YouTube's public InnerTube API (`/youtubei/v1/search`) via native Deno `fetch()`. Search latency drops from ~16 seconds down to ~200ms with zero external dependencies.
- **Resilient Fallback**: If an InnerTube request encounters network failures or upstream schema changes, Raven automatically emits a diagnostic notice to `stderr` and gracefully falls back to `yt-dlp --flat-playlist`.

---

### Command-Line Reference

#### Options

| Option | Description |
|---|---|
| `-a, --audio` | Enable Audio Mode (suppress video) |
| `-n, --limit <num>` | Maximum number of Search Results (default: `10`) |
| `-h, --help` | Show help message and exit |
| `-v, --version` | Show version number and exit |

#### Commands

| Command | Description |
|---|---|
| `maester` | Check that external dependencies (`yt-dlp`, `fzf`, `mpv`) are installed |

#### Examples

| Task | Command |
|---|---|
| Search and pick video | `raven Odyssey trailer` |
| Direct Target playback | `raven https://youtu.be/dQw4w9WgXcQ` |
| Background music (Audio Mode) | `raven -a lofi hip hop` |
| Direct Target in Audio Mode | `raven -a https://youtu.be/dQw4w9WgXcQ` |
| Expanded search results | `raven -n 20 synthwave mix` |
| Check environment health | `raven maester` |

---

## 🏰 Beyond the Wall (roadmap)

Ideas for future versions — no promises on timing, just the direction:

- Windows support
- Support for media players beyond `mpv`
- Playlist / queue mode — build your own offline-first, ad-free listening queue
- Resume playback from where you left off
- Quality/resolution selection

---

## 🏴 Contributing

This is an early, actively-evolving project. Issues and ideas are welcome — open one on the [Issues page](../../issues).

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
