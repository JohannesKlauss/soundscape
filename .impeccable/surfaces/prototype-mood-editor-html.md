---
version: 1
slug: "prototype-mood-editor-html"
primary_target: "prototype/mood-editor.html"
related_targets: ["prototype/mood-editor.css","prototype/mood-editor.js","prototype/mood-state.js"]
---

# Mood preparation editor

Mode: Operate. Target: `prototype/mood-editor.html`. Desktop-native app interaction prototype; the browser is only its preview medium. Audience: a TTRPG game master preparing an atmosphere between sessions. Default: 3–6 layers, larger mixes scroll in a stable grid. Desktop windows only; no phone layouts or mobile QA.

## Direction contract

THESIS: Compose an evocative atmosphere in an ordered, Syrinscape-like sound grid. Refuse freeform placement, node logic, channel-strip chrome, and navigation away from the mix to find a sound.

OWN-WORLD: The live-view prototype is the color authority: #0a0a0c void, #f5f4f0 ink, white-alpha borders and text, neutral near-black panels. No olive/green editor chrome or separate accent palette. Keep its Oswald mood headings, Space Grotesk UI, and familiar white controls. Environmental color comes from artwork. Prototype imagery is private illustrative internet art, never a shipping product asset.

STORY: Switch scene or mood; search the always-visible library bar; audition and add from its drawer, or paste a YouTube/Freesound link/drop a file; tune a selected layer or add alternative sounds inside its tile; save. Keep working drafts, search, and browsing position across context changes.

FIRST VIEWPORT: App/scene navigation, then a horizontal mood strip and new-mood plus. A generous regular three-column grid holds five sound tiles and an Add sound slot; selected-sound settings sit at right. A persistent bottom library/search/quick-actions bar and listening/save transport remain visible. The library drawer rises over the lower editor, without rearranging tile positions.

FORM: User selected `prep-grid-classic` for structure, then explicitly pinned top mood navigation and a bottom library drawer with search and quick actions always visible. The grid sketch is a topology/density reference only; `prototype/live-view.html` is the authoritative palette. The user rejected the olive/green draft and mobile work. seed:0b65d2e6824c6f77. Signature: one continuous search → drawer → audition/add → layer-adjust flow; short panel reveals and grid-content fades carry context without decorative grid movement.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Scope and states

Clickable browser prototype for a native desktop app only. Verify desktop windows at 1024×768, 1280×800, 1440×900, and 2128×833—not phone layouts. Playback and imports are explicitly simulated; local storage retains mix drafts and imported metadata, not media files. No Rust/native changes. Existing live prototype is preserved as `prototype/live-view.html` with links between surfaces. New/duplicate moods, selection, layer levels/pan/fades/loop, search/filter/audition/add/replace/remove/undo, URL/file import demonstration, empty/no-results/invalid-input/storage-error states, reduced motion and keyboard operation belong in the prototype.

## Sound stacks

Confirmed 2026-11-03: a tile can contain multiple source files. They play through and crossfade into the next at the end of the file, never on a fixed interval.

- Preserve the ordered grid and shared tile volume/pan/mute. Multi-source tiles quietly show the source count and In order/Random in their existing metadata line; the tile's name and artwork stay stable when sources are reordered or removed.
- The right pane's Sounds list owns add/remove/reorder. Adding another sound targets that tile explicitly in the existing library drawer; Done, closing, changing context, or deleting the target clears that destination. Imports respect the captured destination, including across mood changes.
- Show Order and a separate Crossfade duration only with two or more sources. In order means round robin; Random uses a non-repeating shuffle bag and avoids immediate repeats at cycle boundaries. Repeat stack controls whether a completed pass starts again. Mood-entry/exit fades remain separate.
- Keep at least one source in a tile; the existing Remove tile/Undo path handles removal of the whole group. Stack edits, duplication, and saves retain their independent working drafts. Older single-source drafts remain valid and clean.
- The prototype still has no audio. Listen plus Next sound demonstrates source selection/file-end advancement; it does not play media, schedule real clip ends, or perform audible crossfades. The native implementation remains the owner's work.
- Compact source-action buttons keep the existing 2px ink focus outline at a local zero offset so their close grouping stays legible; other controls retain the system's normal focus offsets. This is a component-specific exception, not missing keyboard focus.
- No new palette, imagery, visual-world change, or mobile work. DESIGN.md and its token sidecar stay unchanged.

Deferred: music-tone switching by hotkey, node graphs, timeline/event sequencing, real downloads, API-key/auth flows, native audio or persistence integration. The music idea is recorded in PRODUCT.md.
