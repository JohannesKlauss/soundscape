# Sound stacks — desktop prototype finish

## Verdict

**Ship, at browser-prototype scope.** No native macOS implementation, real audio, scheduled clip ends, audible crossfades, or real media import is approved or claimed.

## Independent reviews

- Fresh UI/finish review `e2dbcbbc-8224-419` opened all four final desktop captures and confirmed type, palette, materials, topology, stable tile identity, shared settings, explicit library destination, source editing, repeat-off stopping, and non-repeating Random passes. Its initial `fix` listed three incomplete verification gates, not demonstrated code defects. The continued verdict scored all three **resolved** and returned `ship`.
- Actual reload gate: reordered `waves → hearth → wind`, Random, 7.5s crossfade, 48% shared volume saved and restored; Saved locally shown; transient preview correctly reset.
- Import gate: file metadata increased source count 3→4 without increasing five tiles; switching mood cleared the explicit target and restored ordinary Add actions.
- Narrow keyboard gate: at1024×768, reorder focused the moved LI with tabIndex=-1; Tab/Shift+Tab/Enter reached and activated actions with visible2px focus; inspector scrolling reached advanced fades.
- Fresh code review `1c36781a-081d-4d4`: no material correctness findings; independently ran39/39 model tests. Dedicated reviewer runs failed before doing work because AWS SSO expired; a fresh general-purpose fallback performed the completed review.
- Documentation comparison `c6685a56-15a1-40e`: existing palette/fonts/radii/assets preserved. Canonical and legacy surface briefs now match and document the local zero-offset compact focus-ring exception. DESIGN.md and its sidecar remain unchanged. The shipped documenter type was unavailable, so the comparison used a fresh general-purpose fallback.

## Evidence

-39 model tests;38 stack DOM checks;24 legacy smoke checks and actual reload;15 focused regressions;49 existing independent interaction checks;11 palette checks: all green.
- Final captures: stack-desktop.png1440×900, stack-compact.png1280×800, stack-wide.png2128×833, stack-narrow.png1024×768. Each has three sources in one hearth tile, no root overflow/broken images/clipped chrome, and visible Order/Crossfade controls. Geometry and source-action width checks are in corresponding stack-*-report.json files.
- Last captured app-source hashes remain unchanged through review. No Rust, manifest, lockfile, theme, or migration diff. No new shipping raster assets or mobile work.

## Keep and limits

Preserve the live-view monochrome language and existing grid/top rail/bottom drawer/right inspector. Stacks add only a quiet source-count/order line on tiles and source-list controls in the inspector. In order means round robin; Random is a shuffle bag. Crossfade is separate from mood-entry/exit fades. Next sound manually demonstrates EOF advancement; no fake fixed-duration scheduler was introduced.

Product behavior is recorded in PRODUCT.md, canonical `.impeccable/surfaces/prototype-mood-editor-html.md`, the legacy surface brief, and prototype/README.md. Older single-source version-1 drafts remain valid and clean. Reviews made no implementation edits.
