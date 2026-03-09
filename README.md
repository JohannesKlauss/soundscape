# Soundscape

A desktop soundboard for pen & paper tabletop RPGs. Create atmospheric soundscapes by combining music, loops, ambient sounds, and one-shot effects into moods that you can trigger and crossfade between during your sessions.

Built with [Tauri](https://tauri.app), [SvelteKit](https://svelte.dev), [Tone.js](https://tonejs.github.io/), and [Dexie](https://dexie.org/) (IndexedDB).

## Features

- **Sound Pads** -- combine audio samples into pads with configurable crossfade, fade-in/out, and playback order (round-robin or random)
- **Moods** -- group pads with per-pad volume into moods that crossfade smoothly when switching
- **Library** -- import audio from local files, URLs, Freesound, or YouTube
- **Streaming playback** -- audio streams directly from disk, no memory-heavy buffer decoding
- **Fuzzy search** -- find samples by name or tags
- **Drag & drop** -- drag samples from the library onto pads
- **Inline editing** -- double-click to rename samples, pads, and sound sets

## Download

Grab the latest release for your platform from [GitHub Releases](https://github.com/johannesklauss/soundscape/releases):

- **macOS** -- `.dmg` (Apple Silicon & Intel)
- **Windows** -- `.msi`
- **Linux** -- `.AppImage` / `.deb`

## Building from source

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/)
- [Tauri CLI prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform

### Setup

```sh
git clone https://github.com/johannesklauss/soundscape.git
cd soundscape
npm install
```

Copy the environment template and fill in your API keys:

```sh
cp apps/desktop/.env.example apps/desktop/.env
```

You'll need:
- A **Freesound API key** -- register at [freesound.org/apiv2/apply](https://freesound.org/apiv2/apply)
- A **YouTube Data API v3 key** -- create one at [console.cloud.google.com](https://console.cloud.google.com)

### Development

```sh
cd apps/desktop
npm run tauri dev
```

### Production build

```sh
cd apps/desktop
npm run tauri build
```

The built application will be in `apps/desktop/src-tauri/target/release/bundle/`.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri v2 |
| Frontend framework | SvelteKit + Svelte 5 (runes) |
| UI components | bits-ui + daisyUI |
| Audio engine | Tone.js + Web Audio API |
| Database | Dexie (IndexedDB) |
| Search | Fuse.js |
| Linting | Biome |
| Monorepo | Turborepo |

## License

[MIT](LICENSE)
