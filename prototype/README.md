# Soundscape browser prototypes

Private interaction studies for the native macOS desktop app, separate from the Rust application. The browser is only the preview medium, not a mobile-web target. The owner implements the native UI; nothing in this folder is production code or a native integration.

The live view defines the shared near-black/white color language. Window-size checks target desktop layouts (1024, 1280, 1440, and 2128px widths); there are no phone-specific layouts.

## Open

From the repository root:

```sh
python3 -m http.server 4317 --bind 127.0.0.1 --directory prototype
```

- [Mood preparation](http://127.0.0.1:4317/mood-editor.html)
- [Live view](http://127.0.0.1:4317/live-view.html)
- [Sound library](http://127.0.0.1:4317/sound-library.html)

`index.html` redirects to the renamed live view, preserving the original entry point. The views link through the mood editor. Images, fonts, scripts, and styles are local; no build step or account is required.

## Try the mood editor

- Switch scenes and moods; the working mix stays intact.
- Click a sound to edit level, pan, fades, loop, and inclusion in the mood.
- In the right pane, **Sounds → Add another sound** builds a stack inside the same tile. Add from the library or import while its destination is shown; **Done** returns to the mix.
- Reorder/remove sources in that list, choose **In order** (round robin) or **Random**, and set **Crossfade** independently of the mood-entry/exit fades. Sources play through before advancing; Random avoids repeats until every source has played. **Repeat stack** repeats the pass.
- Listen to the tile, then use **Next sound** beside the Sounds heading to demonstrate file-end advancement. This changes only the preview indicator, not the saved mix; actual clip-end scheduling and audible crossfades are native-engine work, not simulated audio.
- Use the persistent search bar to open the library drawer; audition or add a layer without leaving the mix.
- Use **Paste link** for the YouTube/Freesound/audio-link import demonstration, or **Files** / file drop for local audio metadata.
- Create or duplicate a mood, remove a sound and undo, then save.
- `/` focuses library search; Escape closes the drawer. `1–8` selects a mood, `⌥1–4` switches scenes, Space previews the mood, and `⌘S` / `Ctrl+S` saves. Shortcuts do not replace typing in fields.

**Playback and imports are simulated.** No media is played, downloaded, uploaded, or stored. Browser local storage retains mix drafts and imported names/source metadata only. The live view also remains an interaction simulation; it is not connected to the native audio engine.

Artwork is illustrative internet material for this private prototype only, not product imagery; see [asset sources](assets/SOURCES.md). Fonts are self-hosted under their included OFL licenses.

## Try the sound library

- Search, filter, and sort sounds; select one to inspect, rename, tag, or delete it. Select multiple sounds to edit tags in bulk.
- Use **Files** / file drop or **Import link** to add file or YouTube/audio-link metadata. Previews and imports are simulated: no audio is played, uploaded, downloaded, or stored.
- Search also shows separate example Freesound results; preview or add one to the library. Results are simulated, with no Freesound network request or audio download.
- Select a mood in the editor, then inspect a sound and use **Add to selected mood**. Return to the mood editor to review and save the mood. The library and editor share browser local storage on the same origin; changes are not native-app integration.

## State tests

```sh
node --test prototype/tests/*.test.cjs
```

The state model is a plain script usable by the browser and Node, with no npm dependencies. Stack settings extend the existing version-1 draft format without invalidating older single-source drafts. Playback cursors are transient and are never saved as mix edits.

## Browser checks

With the local preview server running and Google Chrome installed:

```sh
node .impeccable/review/browser-check.cjs all
node .impeccable/review/browser-check.cjs script prototype/tests/mood-stack.browser.js
```

The stack suite drives real DOM add/reorder/remove, both orders, repeat/stop, import destinations, context changes, undo, save, and duplicate isolation. Checks use private, disposable browser profiles; file fixtures contain illustrative metadata only.
