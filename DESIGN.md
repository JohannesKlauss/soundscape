---
name: Soundscape Prototype Design System
description: Near-black/off-white control language for a desktop TTRPG soundboard; artwork supplies every scene color, chrome stays monochrome.
colors:
  void: "#0a0a0c"
  panel: "#080a0d"
  ink: "#f5f4f0"
  ink-hover: "#e4e3df"
  ink-dim: "rgba(245, 244, 240, 0.55)"
  ink-ghost: "rgba(245, 244, 240, 0.28)"
  surface: "rgba(245, 244, 240, 0.04)"
  surface-raised: "rgba(245, 244, 240, 0.08)"
  line: "rgba(245, 244, 240, 0.14)"
  line-strong: "rgba(245, 244, 240, 0.35)"
  error: "#efab99"
typography:
  display:
    fontFamily: "Oswald, sans-serif"
    fontSize: "34px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "normal"
  brand:
    fontFamily: "Oswald, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.18em"
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "normal"
    letterSpacing: "normal"
  body:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "normal"
    letterSpacing: "normal"
  label:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.void}"
    rounded: "{rounded.sm}"
    padding: "8px 13px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
    textColor: "{colors.void}"
  button-primary-active:
    backgroundColor: "{colors.ink-hover}"
    textColor: "{colors.void}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 13px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-raised}"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    size: "36px"
  sound-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "11px 13px 13px"
  sound-card-selected:
    backgroundColor: "rgba(245, 244, 240, 0.06)"
  mood-tab:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "5px 13px 5px 5px"
  mood-tab-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.void}"
  toast:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 10px 8px 16px"
---

# Design System: Soundscape Prototype

## Overview

**Creative North Star: "Ink on Void"**

The system is named after its own two load-bearing tokens: `--void` (#0a0a0c), the near-black ground everything sits on, and `--ink` (#f5f4f0), the single off-white that carries text, icons, borders-at-rest, and every active/selected state. The palette is a shared near-monochrome void/ink core: a few nearby neutral panels (`--panel`) plus ink-alpha layers (`--surface`, `--surface-raised`, the `--line` family) sit close to, but are not strict alpha derivations of, void/ink — there is no chromatic accent anywhere in the system. The one deliberate exception is a muted coral (`--error`) reserved exclusively for invalid input; it is a feedback signal, not an accent.

This is a control surface for a tool that must recede: the GM glances at it between seconds of narration, and the artwork on each mood/sound tile is what actually carries scene color and emotional read. The chrome's job is to stay legible and quiet underneath that imagery — restrained hairline borders, a condensed display face used sparingly, and one compact UI face for everything else. These are clickable browser prototypes (`prototype/mood-editor.html`, `prototype/live-view.html`) built to preview a native macOS gpui application; the browser is a preview medium only, and the owner implements the real UI in Rust. Interactive states (selection, hover, drag, search, import forms) work in-prototype, but playback and media imports are explicitly simulated — no audio plays and no files are downloaded.

**Key Characteristics:**
- Two-color core (void + ink); nearby neutral panels and ink-alpha layers build the rest, with no chromatic accent.
- Artwork supplies scene color; UI chrome never competes with it.
- Oswald carries the wordmark and mood/context display titles (prep's one editable heading, live view's mood titles and standby heading); everything else is Space Grotesk.
- Mostly flat, tonal depth in prep (hairline borders, alpha layering); the live view's active mood frame and two detached prep overlays (drawer, toast) are the system's only shadows.
- Muted coral exists for exactly one job: invalid input feedback.

## Colors

A near-monochrome palette anchored by ink and void, with nearby neutral panel/hover values and white-alpha surface layers. Muted coral is reserved for invalid-input feedback.

### Primary
- **Ink** (`#f5f4f0`): the only "active" color in the system. Used for primary text, icon strokes, hairline-to-solid borders on focus/hover, and as the fill for selected/active controls (mood tab active state, pressed listen/mood toggle, primary button). On an active-filled control, ink becomes the background and void becomes the text color — the two tokens invert rather than introducing a third color.
- **Ink Hover** (`#e4e3df`): a slightly dimmed ink, used as both the hover **and pressed/active** state of ink-filled controls (`.primary:hover:not(:disabled), .primary:active:not(:disabled)`; `.mood-tab.is-active:hover`) so a filled control still visibly responds without inverting again. These ink-filled-control states (`button.mood-tab.is-active`, `button.tile-listen[aria-pressed="true"]`, `button.listen-mood[aria-pressed="true"]`) are declared to outrank the generic `button:hover` rule.

### Neutral
- **Void** (`#0a0a0c`): the base canvas/ground for the whole app (`--ground`, `--canvas` both alias to it).
- **Panel** (`#080a0d`): a marginally deeper near-black used for bars, strips, and drawers that sit structurally apart from the canvas (app bar's neighbors, mood-nav strip, properties inspector, library bar, drawer, transport, toast) — close enough to void to read as "the same darkness," distinct enough to separate zones without a border.
- **Surface** (`rgba(245, 244, 240, 0.04)`): the resting fill for cards, tabs, and list items — ink at 4% opacity laid over void/panel.
- **Surface Raised** (`rgba(245, 244, 240, 0.08)`): the hover fill for buttons and interactive rows — ink at 8%.
- **Ink Dim** (`rgba(245, 244, 240, 0.55)`): secondary text — metadata, field labels, placeholder copy, disabled library-add label.
- **Ink Ghost** (`rgba(245, 244, 240, 0.28)`): tertiary/placeholder-level ink; defined for both prototypes and actively used in the live view for ghost states (e.g. the standby heading) as the dimmest step in the ink family.
- **Line** (`rgba(245, 244, 240, 0.14)`): the default hairline border — appbar/section dividers, card borders at rest, panel seams.
- **Line Strong** (`rgba(245, 244, 240, 0.35)`): the emphasized border — hover borders, dashed empty/drop-target outlines, search box and drawer-top borders, scrollbar thumb.

### Named Rules
**The Two-Color Rule.** `--void` and `--ink` form the shared near-monochrome core; nearby neutral panels and ink-alpha layers provide depth. Do not introduce a separate editor accent: use contrast, inversion, or artwork instead of new chrome hues.

**The Coral Exception Rule.** `--error` (`#efab99`, a muted coral) marks invalid input (`aria-invalid="true"` borders, `.field-feedback` text) and nothing else. It is not a brand color, not a success/status color, and must never be reused for emphasis or decoration.

## Typography

**Display Font:** Oswald (with sans-serif fallback), variable weight 500–600
**Body Font:** Space Grotesk (with system-ui, sans-serif fallback)

**Character:** A condensed, uppercase-leaning display face carries the wordmark and every mood/context display title — the editor's one editable mood-name heading, and the live view's mood titles and standby heading — paired with a plain, slightly geometric grotesk that carries controls, metadata, and body copy. Ordinary buttons, form fields, and metadata use Space Grotesk; the editable mood-title input intentionally keeps its display typography.

### Hierarchy
- **Display** (weight 500, 34px/1.15, uppercase): the prep surface's editable mood-name heading (`#moodName`) only — compacts to 30px under the `max-height: 870px` compact-window query. The live view uses Oswald more broadly for its own display titles: `.mood h2` at 600 weight, 24px/1 at rest, growing to `clamp(56px, 7.5vw, 104px)` for the sounding/hovered mood (`.mood.big h2`), and `#standby h2` at `clamp(40px, 5.5vw, 72px)`. Frontmatter `typography.display` records the editor's default; the live view's sizes are surface-specific and noted here, not globalized.
- **Brand** (weight 600, 16px/1, letter-spacing 0.18em): the "SOUNDSCAPE" wordmark in the app bar. Note: the live-view prototype renders the same wordmark at 13px/0.28em tracking — an observed inconsistency between the two surfaces, not a second intentional variant.
- **Title** (weight 500, 16–19px, no set line-height): section and panel headings — "Sounds in this mood" (16px), the properties inspector's "Sound settings" (19px), the drawer's "Sound library" (17px).
- **Body** (weight 400, 14px root size, no set line-height): default UI text — inputs, buttons, running copy. `.sound-meta` specifically sets line-height 1.5; most other body text has no explicit line-height.
- **Label** (weight 400, 11–12px, ink-dim): metadata lines (`.sound-meta`), field labels, library item captions — weight 400, line-height 1.5 where set. `kbd` is the one label-sized element that uses weight 500.

### Named Rules
**The Display-Titles Rule.** Oswald is reserved for the wordmark and for mood/context display titles — the editor's one editable mood-name heading at prep time, and the live view's mood and standby titles during play. Controls, metadata, and body copy are Space Grotesk everywhere.

## Layout

The palette and font families are shared across both prototype surfaces; control sizing, focus/reset details, and layout composition are surface-specific. Root font-size 14px, the global button/input resets, and the 2–3px focus-ring offset are editor-specific (`prototype/mood-editor.css`) — the live view defines its own sizing and does not inherit them. Structural composition is documented in each surface's own brief, not as a system-wide layout requirement.

As observed on the mood-preparation surface (`prototype/mood-editor.html`): a fixed five-row shell — app bar (56px) → mood strip (72px) → workspace (flexible) → library bar (64px) → transport (64px) — with the library drawer rising as a fixed overlay above the bottom bars rather than reflowing them. The workspace itself splits into the scrollable editor column and a fixed-width properties inspector (288px, narrowing to 264px under `max-width: 1200px`). The sound grid is 3 columns (`repeat(3, minmax(0,1fr))`, 16px gap) by default and drops to 2 columns at `max-width: 1100px`; the library drawer's results grid runs the opposite way — 2 columns by default, 1 at `max-width: 1200px`, 3 at `min-width: 1550px`.

Spacing leans on an approximate 4px rhythm (4 / 8 / 12 / 16 / 20 / 24px) for structural gaps and padding, but the implementation layers hand-tuned odd values on top for optical balance in compact rows — 9, 11, 13, 18, and 26px recur throughout (button padding is `8px 13px`, not `8px 16px`; the app bar is padded `0 24px` but the drawer heading `12px 20px`). Treat the round scale as the guide, the odd values as intentional fine-tuning, not drift to "correct."

A single `max-height: 870px` query compacts the editor for short desktop windows (smaller art, tighter padding, shorter card minimums) — a vertical-space accommodation, not a mobile breakpoint. No phone-width layouts exist or are intended; both surfaces assume desktop window widths (prototype verification range: 1024–2128px wide).

## Elevation & Depth

In the prep surface, mostly flat and tonal: cards, tabs, and tiles do not elevate or cast shadows at rest or on hover, signaling state through border/background alone (`--line` → `--line-strong` → solid ink). The live view is not flat throughout: its sounding/hovered mood frame (`.mood.big .frame`) does cast a shadow to lift the active item off the feed.

### Shadow Vocabulary
- **Drawer rise** (`box-shadow: 0 -12px 32px rgba(0,0,0,0.4)`, prep): cast upward from the library drawer as it slides up over the editor.
- **Toast float** (`box-shadow: 0 10px 28px rgba(0,0,0,0.4)`, prep): cast downward from the toast as it floats above the transport bar.
- **Active mood lift** (`box-shadow: 0 24px 60px rgba(0,0,0,0.45)`, live view): cast under `.mood.big .frame`, the sounding/hovered mood, to lift it off the feed.

### Named Rules
**The Flat-Until-Detached Rule.** In the prep surface, everything that lives in the normal layout — cards, tabs, bars, the inspector — stays flat; shadow is reserved for the two surfaces that physically leave the flow (drawer, toast). The live view's active-mood lift is a separate, surface-specific exception for its one emphasized state, not a contradiction of prep's flatness.

## Shapes

A small, consistent radius scale: 4px (`kbd`, focus corners on the mood-name field), 6px (the default control radius — buttons, inputs, selects, mood tabs), 8px (cards, the add-sound slot, the toast), and 12px (the full-window file-drop overlay). Fully circular (50%) is reserved for small discrete indicators and the range-slider thumb (the unsaved-mood "dirty" dot, listen-toggle states, slider handles) — never for buttons or cards.

In prep, hairline borders (1px, `--line` at rest, `--line-strong` on hover/focus) are the primary structural device; detached overlays and the live view's active mood frame retain the shadows documented above. Dashed borders (1px `--line-strong`, or 2px solid ink on the active file-drop overlay) specifically mark drop targets and empty/add states, distinguishing "place to act" from "place with content." Artwork clips to its container's radius: sound-tile art clips flush (`overflow: hidden` on the 8px card), while `.mood-art` (6px) and `.mood-tab img` (3px) carry their own independent radius rather than inheriting the parent's — artwork radius is not uniformly flush across the system.

## Components

### Buttons
- **Shape:** 6px radius, 36px minimum height, `8px 13px` padding, 140ms background/border/color transitions.
- **Primary:** ink background, void text, 600 weight — the single filled, high-commitment action (Save mood, Import & add). Hover **and pressed/active** both dim to `#e4e3df` with a matching border; disabled drops to 46% opacity.
- **Secondary / Compact:** `--surface` background, `--line` border, ink text, 12px label size — the default button everywhere else (Duplicate mood, Paste link, Files). Hover raises to `--surface-raised` / `--line-strong`.
- **Icon-only:** transparent background and border at rest, 36px square, same hover/active treatment as secondary; used for close/dismiss controls.
- **Text button:** no border, transparent background, ink text, 12px — used for low-emphasis actions like Undo and Cancel.

### Cards / Containers
- **Corner Style:** 8px radius, 1px `--line` border, `overflow: hidden`.
- **Background:** `--surface` at rest; selection adds `rgba(245,244,240,0.06)` and a solid ink border; hover alone only brightens the border to `--line-strong`.
- **Shadow Strategy:** none at rest or hover (see Elevation & Depth — flat until detached).
- **Internal Padding:** `11px 13px 13px` body padding beneath a full-bleed artwork strip.

### Inputs / Sliders
- **Style:** 1px `--line` border, 6px radius, `--surface` background; the search box and import URL field instead use a deeper `rgba(0,0,0,.24–.28)` sunken background with a `--line-strong` border.
- **Focus:** border brightens to solid ink (`:focus-within` on the search box) or the global 2px ink `:focus-visible` outline at 2–3px offset.
- **Error:** border and helper text switch to `--error` (#efab99) via `aria-invalid="true"`; this is the only context that color appears in.
- **Range sliders:** custom-styled — 4px track at `rgba(245,244,240,.22)`, 15px circular ink thumb, no native browser chrome.

### Navigation (mood tabs)
- **Style:** a grid chip (45px thumbnail + name/count stack + dirty-state dot), `--surface` background, 6px radius, max-width 245px with name truncation.
- **Active state:** ink background, void text (the same invert pattern as the primary button), small metadata text dims to `rgba(10,10,12,.65)`; the active tab's hover also dims to `#e4e3df`, matching the primary button's pressed/hover state.
- **Unsaved indicator:** a 5px solid-ink circular dot, shown only while the mood has unsaved edits.

### Signature: Sound Tile Grid
The ordered 3-column sound grid (dropping to 2 columns on narrower desktop windows) is this surface's defining pattern: every layer is a uniform card — artwork strip, inline title, a listen toggle, and an always-visible volume slider — so a GM scans and adjusts without opening anything. Selection and mute are both pure color-state changes (selected: ink border + tinted background; muted: `saturate(.35) brightness(.7)` on the artwork), never a layout shift. An `.add-sound` slot shares the tile's exact footprint but swaps the solid border for a dashed one, keeping "add" visually grouped with the content it adds to rather than set apart as a toolbar action.

## Do's and Don'ts

### Do:
- **Do** keep `--void` (#0a0a0c) and `--ink` (#f5f4f0) as the shared near-monochrome core; build the rest from nearby neutral panels and ink-alpha layers, with no chromatic accent (The Two-Color Rule).
- **Do** let artwork supply all scene color; UI chrome stays void/ink regardless of mood or scene.
- **Do** reserve Oswald for the wordmark and mood/context display titles — the editor's one editable heading, the live view's mood and standby titles — and keep everything else in Space Grotesk (The Display-Titles Rule).
- **Do** keep motion surface-specific: prep uses 140–230ms control/reveal transitions on `cubic-bezier(.22, 1, .36, 1)` and ~1ms under `prefers-reduced-motion`; the live feed has its own longer artwork/list transitions.
- **Do** put a 2px solid ink `:focus-visible` outline (2–3px offset) on every interactive element; never rely on color change alone for focus.

### Don't:
- **Don't** introduce olive/green chrome or a separate "editor" accent palette — the editor and live view share one near-black/white language.
- **Don't** promote `--error` (#efab99, muted coral) beyond invalid-input feedback; it is not a status, success, or brand color (The Coral Exception Rule).
- **Don't** treat this as a phone/mobile product. Design and verify desktop window resizing; 1024–2128px is the current checked range, not a declared native-window minimum.
- **Don't** add drop shadows to prep's cards, tiles, or tabs at rest or on hover — depth there comes from border/background steps, not elevation; this does not extend to the live view's active-mood lift shadow, which is its own surface's exception (The Flat-Until-Detached Rule).
- **Don't** treat the mood-preparation surface's 3-/2-column grid or its bottom library+transport stack as a universal product layout requirement — that composition belongs to its own surface brief, not this system-wide document.
