# AGENTS.md - Soundscape Project Guidelines

This document provides essential information for AI coding agents working in this repository.

## Project Overview

Soundscape is a **Turborepo monorepo** containing two **Tauri 2.x** desktop applications:

- **`apps/desktop`** - Main desktop app running a WebSocket server for scene/audio control (uses Tailwind CSS + DaisyUI)
- **`apps/app`** - Mobile/tablet controller app that connects to desktop via WebSocket

**Tech Stack:**

- Frontend: SvelteKit 2.x + Svelte 5.x + TypeScript
- Backend/Native: Tauri 2.x + Rust
- Styling: Tailwind CSS 4.x + DaisyUI 5.x (desktop only)
- Audio: Tone.js (desktop only)
- Build: Turborepo + Vite

## Build/Lint/Test Commands

### Root Commands (run from project root)

```bash
npm run dev              # Start dev servers for all apps
npm run build            # Build all apps
npm run lint             # Run linting across all apps
npm run format           # Format code with Prettier
npm run check-types      # TypeScript type checking
```

### Running Specific Apps

```bash
npm run dev --filter=desktop    # Run only desktop app
npm run dev --filter=app        # Run only mobile app
```

### App-Specific Commands (run from apps/desktop or apps/app)

```bash
npm run dev              # Start Vite dev server
npm run build            # Production build
npm run preview          # Preview production build
npm run check            # Svelte + TypeScript type checking
npm run check:watch      # Type checking in watch mode
npm run tauri            # Start Tauri development
```

### Tauri/Rust Commands (run from apps/\*/src-tauri)

```bash
cargo build              # Build Rust backend
cargo check              # Check Rust code for errors
cargo clippy             # Run Rust linter
cargo fmt                # Format Rust code
```

### Testing

**No test framework is currently configured.** When tests are added, update this section.

## Code Style Guidelines

### TypeScript/Svelte

**Imports:**

- Use ES module imports with explicit file extensions when needed
- Order: External packages first, then internal modules
- Svelte components use `<script lang="ts">` for TypeScript

```typescript
// External packages
import WebSocket from "@tauri-apps/plugin-websocket";
import { onMount } from "svelte";

// Internal modules
import "../app.css";
```

**Formatting:**

- Prettier handles formatting (run `npm run format`)
- Single quotes preferred for strings
- No semicolons at end of statements (Svelte components follow this pattern)
- 2-space indentation

**Types:**

- TypeScript strict mode is enabled
- Use explicit types for function parameters and return values
- Use `interface` for object shapes (especially Props)
- Use Svelte 5 runes: `$state()`, `$props()`, `$derived()`, etc.

```typescript
// Svelte 5 component example
interface Props {
  children: import("svelte").Snippet;
}

let { children }: Props = $props();
let connected = $state(false);
```

**Naming Conventions:**

- **Files:** kebab-case for routes (`+page.svelte`, `+layout.svelte`)
- **Variables/Functions:** camelCase (`serverIp`, `changeScene`)
- **Types/Interfaces:** PascalCase (`Props`, `SceneCommand`)
- **Constants:** camelCase or UPPER_SNAKE_CASE for true constants

**Error Handling:**

- Use try/catch for async operations
- Log errors with `console.error()`
- Provide user feedback via alerts or UI state

```typescript
async function connect() {
  try {
    ws = await WebSocket.connect(`ws://${serverIp}:8080`);
    connected = true;
  } catch (error) {
    console.error("Connection failed:", error);
    connected = false;
  }
}
```

### Rust (Tauri Backend)

**Imports:**

- Group by: std library, external crates, internal modules
- Use specific imports, not glob imports

```rust
use std::sync::Arc;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::Emitter;
```

**Naming Conventions:**

- **Functions:** snake_case (`start_websocket_server`)
- **Types/Structs:** PascalCase (`SceneCommand`, `AppState`)
- **Constants:** UPPER_SNAKE_CASE

**Error Handling:**

- Use `Result<T, E>` for fallible operations
- Map errors to strings for Tauri commands: `.map_err(|e| e.to_string())?`
- Use `expect()` only for unrecoverable errors

```rust
#[tauri::command]
async fn start_websocket_server(app: tauri::AppHandle) -> Result<String, String> {
    let listener = TcpListener::bind(addr).await
        .map_err(|e| e.to_string())?;
    Ok(format!("Server started on {}", addr))
}
```

**Tauri Commands:**

- Annotate with `#[tauri::command]`
- Register in `invoke_handler` using `tauri::generate_handler![]`

### CSS/Styling (Desktop App)

- Use Tailwind CSS utility classes
- DaisyUI components available (e.g., `btn`, `btn-primary`)
- Custom utilities defined in `app.css` using `@layer base`

```svelte
<button class="btn btn-primary" onclick={() => changeScene('234')}>
  Change scene
</button>
```

## Project Structure

```
soundscape/
├── apps/
│   ├── app/                 # Mobile controller app
│   │   ├── src/routes/      # SvelteKit pages
│   │   └── src-tauri/       # Rust backend
│   └── desktop/             # Desktop soundscape app
│       ├── src/routes/      # SvelteKit pages
│       ├── src/lib/         # Shared components/utilities
│       └── src-tauri/       # Rust backend (WebSocket server)
├── packages/                # Shared packages (currently empty)
├── turbo.json               # Turborepo configuration
└── package.json             # Root workspace config
```

## Dev Server Ports

- Desktop app: `http://localhost:1422`
- Mobile app: `http://localhost:1420`
- WebSocket server: `ws://0.0.0.0:8080`

## Key Dependencies

**Desktop App:**

- `tone` - Web Audio framework for soundscapes
- `bits-ui` - Svelte headless UI components
- `daisyui` - Tailwind CSS component library
- `tokio-tungstenite` - Rust WebSocket server

**Mobile App:**

- `@tauri-apps/plugin-websocket` - WebSocket client for Tauri

## Important Notes

1. **SPA Mode:** Both apps use `adapter-static` with SSR disabled (Tauri requirement)
2. **Node.js:** Requires Node.js >= 18
3. **Package Manager:** npm (v11.6.1 specified)
4. **No ESLint:** Project uses Prettier only; add ESLint if needed
5. **Svelte 5:** Uses new runes syntax (`$state`, `$props`, `$derived`)
