# Soundscape - Agent Instructions

## Project Overview

Soundscape is a pen & paper tabletop RPG audio scenery creation tool. It's a Tauri desktop app built with SvelteKit, Svelte 5 (runes mode), bits-ui, daisyUI, Dexie (IndexedDB), and Tone.js. The monorepo uses Turborepo with the main app at `apps/desktop/`.

## Workflow

### Plan First, Then Build

- Always start in **plan mode** for non-trivial features. Present a concrete step-by-step plan before writing code.
- Plans should list the exact files that will be modified/created and what changes each gets.
- Ask clarifying questions about design decisions upfront (filter behavior, UX patterns, component API shapes) rather than guessing.
- When the user says "implement it" or "go ahead", switch to build mode and execute the plan step by step, marking todos as you go.

### What Gets Accepted

- **Concise, targeted changes.** Small edits to existing files are strongly preferred over creating new files.
- **Following existing patterns.** Before implementing anything, find how the codebase already solves similar problems and replicate that pattern. Examples:
  - `useInlineRename` attachment for inline editing (double-click to edit, Enter to save, Escape to cancel).
  - `SvelteSet` for multi-toggle filter state.
  - bits-ui for behavioral components (Dialog, Popover, Select, Tooltip, Collapsible), styled with daisyUI classes.
  - Reusable components in `$lib/components/` wrap bits-ui primitives with consistent styling.
  - Snippets (`{#snippet ...}`) for template-level decomposition within a component.
  - `.svelte.ts` modules for extracting reactive logic out of components.
  - `liveQuery` from Dexie for reactive database queries.
  - Fuse.js for client-side fuzzy search.
- **Proper Svelte 5 idioms.** Use `$state`, `$derived`, `$effect`, `$props`, `$bindable`, `{@attach}`, `{#snippet}`. No Svelte 4 patterns.
- **Running `svelte-check`** after changes to confirm no new errors were introduced (pre-existing errors in unrelated files are acceptable).

### What Gets Rejected

- **Over-engineered refactoring plans** that create too many abstractions or new files when the original code was fine. The user prefers to do structural refactors themselves. Focus on the feature, not on reorganizing.
- **Guessing at module APIs** without reading the existing code first. Always read the current state of a file before proposing changes.
- **Grid/tile views** for the library. The user explicitly rejected this because it limits the amount of info that can be displayed. List views only.
- **Unnecessary `$effect` wrappers** when a module is always mounted (singleton lifecycle). Only use `$effect` for cleanup when the component can actually unmount.
- **Using daisyUI markup for complex interactive components** (dropdowns, selects, popovers). Always use bits-ui for these and style them with daisyUI classes.
- Comments and inline if return statements

## Architecture Notes

### Domain Structure

Each domain lives in `$lib/domain/<name>/` with:
- `_types.ts` - Zod schemas and TypeScript types
- `ui/` - Svelte components
- Optional `.svelte.ts` files for extracted reactive logic

Key domains: `soundSample`, `soundPad`, `soundSet`, `soundSet/mood`, `previewPlayer`.

### Database

- Dexie (IndexedDB) with schema at `$lib/db.ts`.
- Types are Zod schemas. `SoundSample` has: `id`, `name`, `src`, `contentType`, `category`, `duration`, `type`, `tags`.
- When adding fields, add to the Zod schema in `_types.ts`, bump `db.version()` in `db.ts` with appropriate indexes.
- Use `*fieldName` for multi-entry indexes (arrays like tags).

### UI Conventions

- **Bottom sheet** pattern: `$lib/components/BottomSheet.svelte` wraps bits-ui `Collapsible` for expandable panels pinned to the bottom.
- **Library sample rows**: icon | name (dblclick to rename) | tags (max 3, +N tooltip) | duration (tabular-nums) | hover controls (tag edit popover, grip icon, preview player). Entire row is draggable.
- **Filter bars**: pill-style toggle buttons using daisyUI `join` + `btn btn-xs`. Active = `btn-primary`, inactive = `btn-ghost`.
- **Sort**: bits-ui `Select` with `ArrowUpDown` icon trigger. Nullable sort state (null = no sort applied). "Remove sort" option at bottom.
- **Tag filter**: horizontal scrollable row of tag pills below category filter. AND logic (sample must have ALL selected tags). Clear button when filters active.
- **Inline rename**: `useInlineRename` attachment from `$lib/attachments/`. Double-click toggles span to input, Enter/blur saves, Escape cancels.
- **Popovers** (e.g. tag editing): let bits-ui manage open state via `onOpenChange`. Don't fight it with external `open` prop + `onclick` simultaneously -- that causes double-click-to-open bugs.

### Filter Pipeline Order

Category filter -> Tag filter (AND) -> Fuse.js text search (keys: name + tags) -> Sort

### Freesound Integration

- Tags from Freesound are auto-imported: `sound.tags.slice(0, 5).map(t => t.toLowerCase())`.
- Freesound search is triggered when search text >= 2 chars.
- Infinite scroll via IntersectionObserver on a sentinel element.

## Code Style

- TypeScript strict mode.
- Imports: Svelte/framework imports first, then `$lib/` imports, then relative imports.
- Prefer `const` and `function` declarations over `let` and arrow functions at module level.
- Use `z.array(z.string()).default([])` for optional array fields in Zod schemas so existing records without the field work seamlessly.
