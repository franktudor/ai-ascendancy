# AI Ascendancy

A strictly typed TypeScript + Vite + Vue 3 migration of the complete single-file strategy game from
[`async0x42/ai-ascendancy`](https://github.com/async0x42/ai-ascendancy), source commit
`72c1ba9`. Game writing, balance, art, and audio remain the original author's work.
No analytics, accounts, or backend were added.

## Run

Requires Node.js `^20.19.0 || >=22.12.0` and npm, matching the current Vite and
Vue plugin engine requirements. Node 21 is not supported. The current dependency
set was verified on Windows with Node 26.7.0 and npm 11.19.0.

```sh
npm.cmd ci
npm.cmd run dev
```

On other operating systems, use `npm` instead of `npm.cmd`.

```sh
npm.cmd run typecheck   # strict checking of every TS module, SFC, test and config
npm.cmd run build       # typecheck first, then emit the deployable dist/ directory
npm.cmd run preview     # serve the production build locally
npm.cmd test            # headless game and source-parity checks
npm.cmd exec playwright install chromium
npm.cmd run test:browser -- --repeat-each=3
npm.cmd run format
```

The `test` script uses `node.exe` for this Windows environment. On Linux/macOS,
run `node --import tsx --test tests/*.test.ts` or change that script to use `node`.
Playwright's configured dev-server command also uses `npm.cmd`; change it to
`npm` on Linux/macOS. The `tsx` loader resolves extensionless TypeScript imports;
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
| `@typescript/native` → `typescript` | `7.0.2` | Native compiler for TS modules, tests, and configs |
| `typescript` → `@typescript/typescript6` | `6.0.2` (API compiler `6.0.3`) | Compatibility API required by Vue SFC tooling |
| `vue-tsc` | `3.3.11` | Strict TypeScript and Vue template checking |
| `tsx` | `4.23.15` | TypeScript loader for headless tests |
| `@types/node` | `26.6.3` | Node.js types for tooling and tests |
| `@playwright/test` | `1.63.0` | Chromium browser regression tests |
| `prettier` | `3.9.9` | Source formatting |

Only Vue is a runtime dependency; the rest are development dependencies. Use
`npm.cmd ci` for the locked dependency set. When updating packages, update the
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
  key and `useGame()` (missing providers throw rather than return undefined).
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
- `src/styles/game.css` contains both original CSS layers, in their original
  order. `fonts.css` references all five original WOFF2 files, including the
  original unused Big Shoulders face. `src/assets/music/` contains the original
  intro and theme MP3s. They are fetched/decoded into Web Audio buffers, with the
  original volume, intro handoff, and `[2.25, 240.25]` loop seam. Sound effects
  still use the original synthesized noise grains. Unmount aborts asset fetches,
  disconnects/stops sources, frees buffers, and closes the AudioContext.

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

`tests/preservation.test.ts` executes that actual historical script in an
isolated reference realm and compares data/text, every event effect/choice,
simulation across all architecture/difficulty combinations, costs, availability,
endings, save migration, and original CSS. Tests require the cloned git history.
`tests/browser/game.spec.ts` exercises real Chromium: selection, origin, launch,
saves and erase confirmation, previews, all ending renderers, mobile tree views,
Web Audio decoding, storage denial, runtime remount, and disposal.

The first headless intro behavior test and browser migration test were run while
the feature was missing and observed failing before implementation. Additional
storage-denial and runtime-remount regressions were reproduced and then fixed.

### TypeScript checks

`tsconfig.json` uses `strict: true`, no JavaScript fallback, and includes all
`src/**/*.ts`, `src/**/*.vue`, `tests/**/*.ts`, and both TypeScript configs.
`npm.cmd run build` fails before bundling if any included file fails typecheck.
`npm.cmd run typecheck` runs two required checks:

- `typecheck:native`: TypeScript 7.0.2 checks every `src/data/**/*.ts` and
  `src/game/**/*.ts` module, shared declarations, tests, and Vite/Playwright
  configs through `tsconfig.native.json`, which inherits the strict settings.
  `src/main.ts` is checked by the Vue pass because it imports an SFC.
- `typecheck:vue`: `vue-tsc` checks the entire original project, including
  all Vue scripts and templates, using the TypeScript 6 compatibility API.

`tests/types.test.ts` guards both compiler commands and their coverage.
`tests/type-contracts.ts` additionally rejects widened IDs,
wrong state/API values, untyped effects, invalid event shapes, and injection or
controller signature drift without suppression directives.

There are no blanket `any` types or TypeScript suppression directives. Deliberate
assertions are confined to known boundaries: synchronously assembled game/runtime
APIs, generated keyed catalog indexes, mounted controller DOM nodes/attributes,
verified non-null controller state, and the original VM reference API. Storage
JSON is a compatibility boundary: loading retains the original v2/v3 envelope
check and default-field merge, not a new incompatible validation policy.

The compiler and supporting tool versions are listed under Dependencies above;
`package-lock.json` records the complete resolved dependency graph.

## Limits

The canvas map, 4D tech-tree layout and list cards, incident/briefing presentation,
codex, ending cinematics, and menu actions still use isolated imperative
controllers rather than being rewritten entirely in Vue. This preserves their
original detailed behavior. Browser automation checks rendering and playback
state, not subjective audio listening or pixel-perfect screenshot equivalence.
Full-length human playthroughs of every random path were not performed; the
complete rules/effects are covered against the original source instead.
