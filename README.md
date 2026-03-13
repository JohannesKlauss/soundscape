# Soundscape

A desktop soundboard for your TTRPG sessions. Create atmospheric soundscapes by combining music, loops, ambient sounds, and one-shot effects into moods that you can trigger and crossfade between during your sessions.

## Features

- **Sound Pads:** Combine audio samples into pads with configurable crossfade, fade-in/out, and playback order
- **Moods:** Group pads with per-pad volume into moods that crossfade smoothly when switching
- **Library:** Import audio from local files, URLs, Freesound, or YouTube
- **Local Only:** All sounds, soundscapes, pads, and moods are saved locally. No account, no ads, no subscription, no bullshit.

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
- A **Freesound API key** (register at [freesound.org/apiv2/apply](https://freesound.org/apiv2/apply))
- A **YouTube Data API v3 key** (create one at [console.cloud.google.com](https://console.cloud.google.com))

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

## License

[MIT](LICENSE)
