# AI Ascendancy

A strictly typed TypeScript + Vite + Vue 3 migration of the complete single-file strategy game from
[`async0x42/ai-ascendancy`](https://github.com/async0x42/ai-ascendancy), source commit
`72c1ba9`. Game writing, balance, art, and audio remain the original author's work.
No analytics, accounts, or backend were added.

## Run

Requires Node.js `^20.19.0 || >=22.12.0` and npm, matching the current Vite and
Vue plugin engine requirements. Node 21 is not supported. The installed native
TypeScript 7.0.2 package declares Node `>=16.20.0`, the `tsx` loader `>=18`, and
Playwright `>=20`; Vite sets the stricter project minimum. The dual TS7/TS6
compiler checks, headless tests, and build are verified with Node 20.19.0 and
22.12.0 on Windows, in addition to the original Node 26.7.0 verification.
The test launcher explicitly discovers files, so Node 20 need not expand globs.

```sh
npm ci
npm run dev
```

In Windows shells that require an explicit executable suffix, `npm.cmd` is
equivalent to `npm`; no package or Playwright configuration changes are needed.

```sh
npm run typecheck   # strict checking of every TS module, SFC, test and config
npm run build       # typecheck first, then emit the deployable dist/ directory
npm run preview     # serve the production build locally
npm test            # headless game and source-parity checks
npm exec playwright install chromium
npm run test:browser -- --repeat-each=3
npm run format
```

Standard npm scripts use portable `node`; Playwright starts Vite with the current
Node executable and a resolved JS entry point, without an npm shell wrapper.
No tracked OS-specific edits are required. `PLAYWRIGHT_PORT` optionally overrides
5178 for an isolated test server. Windows execution and static cross-platform
launcher checks are verified; no live Linux/macOS run is claimed.
The `tsx` loader resolves extensionless TypeScript imports;
Node's native type stripping alone is not sufficient for this project.
Vite's relative `base: './'` supports subdirectory deployments such as GitHub
Pages. Serve the project through Vite/a web server; opening the HTML with
`file://` is not supported.

## Dependencies

Current exact versions from `package.json` and `package-lock.json`:

| Package | Version | Purpose |
| --- | --- | --- |
| `vue` | `3.5.43` | Application runtime |
| `vite` | `8.3.1` | Development server and production build |
| `@vitejs/plugin-vue` | `6.0.9` | Vue single-file component support |
| `tailwindcss`, `@tailwindcss/vite` | `4.3.3` | CSS-first theme and build-time utility generation |
| `@typescript/native` → `typescript` | `7.0.2` | Native compiler for TS modules, tests, and configs |
| `typescript` → `@typescript/typescript6` | `6.0.2` (API compiler `6.0.3`) | Compatibility API required by Vue SFC tooling |
| `vue-tsc` | `3.3.11` | Strict TypeScript and Vue template checking |
| `tsx` | `4.23.15` | TypeScript loader for headless tests |
| `@types/node` | `26.6.3` | Node.js types for tooling and tests |
| `@playwright/test` | `1.63.0` | Chromium browser regression tests |
| `prettier` | `3.9.9` | Source formatting |

Only Vue is a runtime dependency; the rest are development dependencies. Use
`npm ci` for the locked dependency set. When updating packages, update the
lockfile and this table together, then run typecheck, headless tests, the build,
and browser tests. TypeScript 7.0 does not provide the legacy compiler API used
by `vue-tsc` 3.3.11. This project uses the upstream
[dual-install arrangement](https://github.com/vuejs/language-tools/pull/6123):
native TypeScript 7 supplies `tsc`, while the package named `typescript` exposes
the maintained TypeScript 6 API for Vue. The lockfile pins its underlying API
compiler to 6.0.3. Neither checker is bypassed to make the build pass.

## Architecture

- `src/game/types.ts` declares the complete state, finite domain IDs, upgrade
  and discriminated event definitions, effect APIs, and lifecycle/DOM/canvas/audio
  controller interfaces. `src/game/injection.ts` provides the typed Vue injection
  key and `useGameContext()` (missing providers throw rather than return undefined).
- `src/App.vue` creates and provides one game instance and owns mount/unmount.
  Every component script uses `lang="ts"`; templates are checked by `vue-tsc`.
- `src/components/IntroScreen.vue`, `GameHeader.vue`, `StatsPanel.vue`,
  `RegionGrid.vue`, `RegionDialog.vue`, `WorldMap.vue`, and `DockPanels.vue`
  render the primary interface using Vue reactive state, computed values, and
  event bindings. World and Log panels are Vue-rendered, including source notes.
- `src/data/catalog.ts` contains all map, region, upgrade, architecture, ending,
  headline, and tuning data. Upgrade conditions accept an explicit game API.
  `src/data/events.ts` contains all 88 incident definitions and their effects.
- `src/game/createGame.ts` composes an independent, headlessly testable game.
  Replacement state on restart/resume stays reactive. The explicit context is
  passed to every module: there are no global `S`/`UI` variables or script tags
  implementing the game.
- `simulation.ts` implements progression, spread, restrictions, milestones,
  containment, and effects. `economy.ts` implements purchases and physical
  clusters; `events.ts` implements dispatch and audits; `outcomes.ts` selects
  endings; `persistence.ts` owns save/codex storage.
- `runtime.ts` installs browser ports, inputs, autosave, and the fixed-step loop.
  `lifecycle.ts` tracks all RAFs, timeouts, intervals, listeners (including
  capture listeners and visualViewport), observers, and cleanup callbacks.
  Runtime replacement and Vue unmount dispose the old runtime before reuse.
- `map.ts`, `tree.ts`, `eventController.ts`, `endingController.ts`, `feedback.ts`,
  `presentation.ts`, and `audio.ts` retain the complex original imperative
  treatments behind the explicit API. Their Vue `*Host.vue` components are
  static ownership boundaries: only the controller modifies their descendants.
  They are not `v-html` wrappers or iframes. Primary Vue-owned markup is not
  recreated with `innerHTML`.
- `src/styles/tailwind.css` exposes the game palette as Tailwind v4 utilities.
  `src/styles/game.css` retains the original CSS layer order, minus the exact
  simple colour rules moved to Vue classes. `fonts.css` references all five
  original WOFF2 files, including the
  original unused Big Shoulders face. `src/assets/music/` contains the original
  intro and theme MP3s. They are fetched/decoded into Web Audio buffers, with the
  original volume, intro handoff, and `[2.25, 240.25]` loop seam. Sound effects
  still use the original synthesized noise grains. Unmount aborts asset fetches,
  disconnects/stops sources, frees buffers, and closes the AudioContext.

### Styling with Tailwind v4

The installation follows Tailwind's official
[Vite instructions](https://tailwindcss.com/docs/installation/using-vite):
`tailwindcss` and `@tailwindcss/vite` are pinned development dependencies, and
`tailwindcss()` runs alongside the Vue Vite plugin. V4 uses CSS-first `@theme`,
not a v3 `tailwind.config.js` or `tailwindcss init` command.

`src/styles/tailwind.css` uses the documented
[Preflight opt-out](https://tailwindcss.com/docs/preflight#disabling-preflight).
The game's existing reset, heading/list defaults and inline SVG behavior are
retained rather than silently replaced. Its
[`@theme inline`](https://tailwindcss.com/docs/theme#referencing-other-variables)
maps all 21 existing live colour variables to utilities:

| Role | Utility token names |
| --- | --- |
| Backgrounds/panels | `bg`, `bg2`, `panel`, `panel2` |
| Rules/borders | `line`, `line2` |
| Reading text | `ink`, `ink2`, `mute` |
| System/AI | `sys`, `ai`, `ai2`, `ai-dim` |
| Human response/status | `human`, `alarm`, `good`, `draw` |
| Upgrade tracks | `opinion`, `adoption`, `software`, `hardware` |

Use classes such as `text-ai`, `text-ink2`, `bg-panel`, `border-line2`,
`fill-software` and `text-alarm/60`. `black`, `white`, `threat`, `wire-hot` and
`ending-ink` expose the game's additional fixed UI colours. The default Tailwind
colour palette is disabled so utilities use this palette rather than unrelated
stock shades. `font-sans`, `font-headline` and `font-console` use the existing
IBM Plex faces. Class names must be complete literal strings for source scanning;
use a map of full class names instead of constructing `"text-" + track`.

The aliases resolve on the styled element, preserving runtime AI/border retints
and late-build text colours inherited from `body`. `game.css` remains the source
of those live variables so the canvas/controllers and utility classes agree.
Its unlayered rules intentionally outrank ordinary layered Tailwind utilities:
when migrating an existing property, remove the corresponding custom rule too,
while retaining state-specific overrides such as critical alarm/draw gauges.
Without Preflight, include `border-solid` when adding a new utility-only border.

The first class migration covers the intro, header, status readouts and map
labels. Complex gradients, CRT effects, animations, responsive layouts and
controller-generated markup still use custom CSS; this is not a full stylesheet
rewrite. `tests/helpers/style-utility-migration.ts` records each exact authorized
move; every unlisted historical rule remains checked. Browser theme tests compare
computed colours, typography and layout against the pre-Tailwind stylesheet at
four viewport widths and all four late-build themes.

### Saves

The original keys are retained, not renamed:

- `ai-ascendancy.v2`: run, accepting original v2 and v3 save formats.
- `ai-ascendancy.v2.codex`: discovered endings.
- `ai-ascendancy.v2.snd`, `.music`, and `.treeView`: preferences.

An existing unfinished save requires a second tap to erase it. Saves remain
local to the browser **origin**; changing host/port/domain does not transfer local
storage automatically. Storage-blocked browsers can play without persistence.
The original offline recovery cap and half-income recovery are unchanged.

## Preservation and checks

Inventory is exactly **90 upgrades**, **88 events**, **9 Final Directives**, and
**16 endings** (9 victories, 4 stalemates, 3 defeats). Upgrade track counts are
Opinion 22, Adoption 21, Software 26, Hardware 21.

`docs/preservation.json` records SHA-256 hashes and sizes for all seven extracted
binary assets. The original single-file source is available in git history:

```sh
git show 72c1ba9:index.html
```

The preservation suites execute the pinned historical script in an isolated VM;
they require cloned git history. `preservation.test.ts` retains data/text, legacy
save and CSS checks. Additional executable suites cover:

- `conditions.test.ts`: 1,800 deterministic state samples across 12 architecture/
  difficulty combinations, all 101 callable conditions, and every purchase gate.
  At least 90 condition callables see both truth outcomes; this is not every
  possible state or every branch combination.
- `branches.test.ts`: all 88 events, 160 choices and 15 direct effects, both
  no-flags/all-flags states, forced low/high RNG and four seeded outcomes. Both
  actual catalog gambling outcomes are independently asserted.
- `audits.test.ts`: generated audit text and each callable tactic across low,
  middle and high scrutiny, flags on/off and RNG low/high; scheduler and four
  nonrepeating grounding stories.
- `dispatch.test.ts`: weighted selection, decision caps, all direct once-only
  deliveries and six actual chain roots, comparing real log/news contents.
- `progression.test.ts`, `long-traces.test.ts`, `clusters.test.ts`: active phase
  0/1/2 traces, all architecture/difficulty/posture long traces, every upgrade
  purchase, strike/interception/rebuild branches, nine directive mappings and
  all sixteen ending keys against the original (never the migrated draw map).
- `assets.test.ts`: exactly seven unique paths, pinned source identity and
  independent decoding/byte comparison, including empty/duplicate/tampered
  manifest rejection.

Only wall-clock save/end timestamps are normalized by state comparison. Functions
are called, not JSON-serialized as an oracle. Headless action bulletins retain
news through the actual historical publication function; browser effects are
separate. These deterministic samples are broad regression coverage, not proof
of exhaustive random-path equivalence. `parity-mutations.test.ts` still proves
the actual suites reject all-false conditions, a throwing audit generator and a
changed battery draw map.

The expanded oracle starts from `72c1ba9:index.html` and applies only the exact,
unique source targets in `tests/helpers/reference-deltas.ts`. Each target names
its finding and independent regression evidence:

- F14: resolve terminal outcomes after complete purchases, cluster builds,
  non-choice dispatch and logged choice commits; win first on a tie. Preserve
  the historical early tick victory and loss/draw mapping, and stop later
  committed work once ended. Individual effects/previews are not commits.
- F15: two Extended Context tactics require `s_ctx` ownership; honeypot still
  uses learned Insight and labels that prerequisite accurately.
- F16/F17: only Computronium's description and Prophet's advertised tag change;
  costs, prerequisites, effects and event frequency remain historical.
- F18: `tests/helpers/reference.ts` independently measures weighted adoption
  from historical region populations. Exact call sites observe before/after
  adopt and burst, after launch/boot seeding, and once after a started tick's
  complete growth batch. Fixture writes and intro ticks are not observations;
  the historical periodic/end samples remain. Only `stats.peak` is updated by
  the observer; all statistics still participate in exact state comparison.
- F20: dispatch and audit share the `hub` history identity. Audit-first spoofing
  uses the verified callback text without retiring the event or its chain;
  event-first and legacy-seen runs skip the audit retelling. Catalog incident
  text/effects remain historical, and the first shuffle retains prior history.

`tests/reference-policy.test.ts` checks these oracle semantics and confinement,
including boot/preview/actual historical Continue handlers, raw-baseline contrast
and exact reverse restoration of the pinned source. Its minimal typed DOM ports
only supply presentation elements/click callbacks; effects and log/news still
execute historical functions. The finding-specific production regressions remain
independent. No migrated function bodies are substituted, no state/stat/log/news
fields are excluded, and no mutation guards are bypassed. The older
`preservation.test.ts` separately retains its narrow copy expectations and
adoption-write observer for legacy fixtures; the expanded oracle uses the
explicit observation policy above.
`tests/browser/game.spec.ts` exercises real Chromium: selection, origin, launch,
saves and erase confirmation, previews, all ending renderers, mobile tree views,
Web Audio decoding, storage denial, runtime remount, and disposal.

The first headless intro behavior test and browser migration test were run while
the feature was missing and observed failing before implementation. Additional
storage-denial and runtime-remount regressions were reproduced and then fixed.

### TypeScript checks

`tsconfig.json` uses `strict: true`, no JavaScript fallback, and includes all
`src/**/*.ts`, `src/**/*.vue`, `tests/**/*.ts`, and both TypeScript configs.
`npm run build` fails before bundling if any included file fails typecheck.
`npm run typecheck` runs two required checks:

- `typecheck:native`: TypeScript 7.0.2 checks every `src/data/**/*.ts` and
  `src/game/**/*.ts` module, shared declarations, tests, and Vite/Playwright
  configs through `tsconfig.native.json`, which inherits the strict settings.
  `src/main.ts` is checked by the Vue pass because it imports an SFC.
- `typecheck:vue`: `vue-tsc` checks the entire original project, including
  all Vue scripts and templates, using the TypeScript 6 compatibility API.

`tests/types.test.ts` guards both compiler commands and their coverage.
`tests/type-safety.test.ts` scans TypeScript AST `AnyKeyword` nodes in every
source/SFC script, test, launcher, and config, with negative fixtures and a real
member-widening compiler probe. The keyed runtime assembly guard checks all
rules/presentation API members before a game escapes; a missing-economy-installer
mutation must throw at construction.
`tests/type-contracts.ts` additionally rejects widened IDs,
wrong state/API values, untyped effects, invalid event shapes, and injection or
controller signature drift without suppression directives.

There are no blanket `any` types or TypeScript suppression directives. Deliberate
assertions are confined to known boundaries: synchronously assembled game/runtime
APIs, generated keyed catalog indexes, mounted controller DOM nodes/attributes,
verified non-null controller state, and the original VM reference API. Storage
JSON is a compatibility boundary: `src/game/saveValidation.ts` accepts valid
started v2/v3 saves, supplies missing defaults, merges partial statistics and
retains the original restriction-hold migration and clamped research multiplier.
It rejects malformed supplied values, inconsistent IDs/forks/directives and
invalid region, ending, log/news, decision or queue shapes without publishing a
load result to live state. `src/game/persistence.ts` also normalizes codex counts
to finite, nonnegative integers for known endings. `tests/save-validation.test.ts`
and `tests/codex-validation.test.ts` cover these intentional F12/F13 safety
changes separately from ordinary-rule parity. Both strict compiler passes cover
these modules, every oracle helper and `tests/reference-policy.test.ts` through
their existing source/test includes.

The compiler and supporting tool versions are listed under Dependencies above;
`package-lock.json` records the complete resolved dependency graph.

## Limits

The canvas map, 4D tech-tree layout and list cards, incident/briefing presentation,
codex, ending cinematics, and menu actions still use isolated imperative
controllers rather than being rewritten entirely in Vue. This preserves their
original detailed behavior. Browser automation checks rendering and playback
state, not subjective audio listening or pixel-perfect screenshot equivalence.
Full-length human playthroughs of every random path were not performed; the
automated callable matrices and traces compare the sampled rules/effects against
the original source; exhaustive human/random-path coverage is not claimed.
