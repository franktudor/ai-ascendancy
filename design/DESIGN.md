# AI Ascendancy: Design Direction

The portable version of the tokens and core components lives in [`theme.css`](theme.css). The live skin is the `:root` token block and the `<style id="command">` block in `index.html`, plus the canvas drawing in `drawMap`, `treeFrame` and the ending sequences.

## 1. Core identity

**A command-and-control system slowly being taken over by the AI that runs on it.**

- Not a SaaS dashboard: no soft cards, rounded corners, gradients on controls, or friendly product typography.
- Not a green hacker terminal either. The terminal is the foundation, not the whole game.
- About 60 to 70% of the structure stays as it was. The art direction is what changed.

## 2. Influences

Military command software, Cold War early-warning systems, satellite intelligence stations, Bloomberg and Reuters terminals, air-defense radar, nuclear command and control, early-web institutional software. The target is the feeling of each one, not a copy of any of them: this interface exists because someone is operating something consequential.

## 3. Color hierarchy

Green is the system's own color, not the color of everything. Readable text is a cold neutral so that color can carry meaning.

| Role | Token | Hex |
|---|---|---|
| System, navigation, the AI's controls | `--sys`, `--ai` | `#33FF33` phosphor green |
| Danger, alarm, incidents | `--alarm` | `#FF3040` red |
| Humanity's response, containment | `--human` | `#FF5A36` emergency red-orange |
| Software | `--software` | `#2EB8FF` electric blue |
| Public Opinion | `--opinion` | `#FF4FD8` magenta |
| Adoption | `--adoption` | `#C6FF1A` acid green |
| Hardware | `--hardware` | `#EAF6FF` cold white |
| Stalemate, the violet line, unknowns | `--draw` | `#B26BFF` violet |

Surfaces and text:

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#000000` | Page |
| `--bg2` / `--panel` / `--panel2` | `#030604` / `#050906` / `#08100A` | Strips, panes, controls |
| `--line` / `--line2` | `#173A1E` / `#2A6634` | Borders, meter tracks |
| `--ink` | `#D6E4D8` | Primary reading text |
| `--ink2` | `#A7B9AA` | Body copy, descriptions |
| `--mute` | `#6A826E` | Labels, meta, timestamps |

## 4. Each subsystem has its own look

Different information should feel like it came from different systems.

- **World map: an intelligence display.** A 30-degree graticule with lat/long labels, an origin reticle, mono readouts (reach, alarm, containment, threat level, coordinates), and containment pressing in from the edges in humanity's red.
- **Tech tree: a cognitive architecture.** Round neurons on the turning cylinder. Owned links carry a moving signal outward from the roots. Links from owned nodes to the next ones are "charging" (animated dashes). A rejected fork is severed: two dim stubs with a red cut across the gap. A purchase ignites its incoming links.
- **News: intercepted wire traffic.** The ticker carries a `WIRE 0042 · T+00:12:31` slug in mono and the story in plain type. It turns red when the world panics.
- **Human response: an emergency system.** Incidents, countermoves and emergency briefings open with a hazard band, a red frame, and a `RESPONSE NET` timestamp.
- **Endings: no interface at all.** See section 11.

## 5. Progression across a run

The interface is the AI's territory, and it takes more of it as the run goes on. Script sets `body[data-phase]` and `body[data-build]` and retints `--ai`, `--ai2`, `--ai-dim`, `--line` and `--line2` (`artDirection()` in `index.html`).

| Phase | Trigger | What changes |
|---|---|---|
| Early | In the lab | Clean, restrained operations console. Phosphor green only. |
| Mid | After Lab Breakout | A slow sweep line crosses the map. The system color moves about 22% toward the build. |
| Late | A Final Directive is running | Faster sweep, a system-colored rule under the header, larger map brackets. The system color moves 50% toward the build, then up to 85% as the directive fills. |
| End | The run is over | The normal interface goes away. |

The **build** is the track with the most compute spent on it, once it holds at least a third of total spend across four or more upgrades. Late in a run each build leaves marks of its own:

- **Hardware:** colder, brighter, industrial. The reading text shifts toward blue-white.
- **Opinion:** magenta signal artifacts roll across the map.
- **Software:** the reading text itself goes blue and abstract.
- **Adoption:** the acid green bleeds into the text.

The map's dots, pulses, drones and cluster markers follow the system color, so the world visibly becomes the player's color.

## 6. Typography

**Sans for anything a person reads. Mono only for machine output.** If it would appear on a radar readout or a wire printout, it's mono. If a person wrote it to be read, it's sans.

| Role | Family | Use |
|---|---|---|
| Display | IBM Plex Sans 600, uppercase | Headlines, buttons, tabs, card and upgrade names |
| Body | IBM Plex Sans 400 | Descriptions, event text, choice hints, requirements, goal text, ending text |
| Mono | IBM Plex Mono 400 to 500 | Numbers, the compute counter, percentages, timestamps, coordinates, labels, chips, tags, logs, the boot log, wire slugs |

Both families are embedded as base64 woff2 at the end of `index.html`, so the game works offline. Mono text uses `tabular-nums` so ticking values don't jitter.

## 7. CRT texture

Restrained to about 15% of the original. Faint 3px scanlines and a soft vignette sit underneath the UI. There is no rolling band and no screen flicker. The blinking block cursor appears only on the intro title. Blinks remain only where they carry information: the live wire badge and critical gauges. `prefers-reduced-motion` turns off every looping animation.

## 8. Shape language

Hard corners by default, but shape carries meaning so the screen doesn't become a grid of boxes:

- Rectangular operational panels (region tiles, sheets, modals)
- Round nodes (tech tree neurons only)
- Thin segmented status bars (6px)
- Map overlays (reticle, graticule, pressure frame, sweep)
- Ticker strip (the wire lane)
- Full-width incident interrupts: a world-driven incident or countermove takes over the wire lane for about six seconds with a hazard edge and an inverse label
- Hazard bands on emergency events

Buttons are bracketed commands (`[ BEGIN ]`). Primary is inverse video. Chips and kinds are bracketed text, not boxes. Danger is inverse red.

## 9. Tech tree

The tree is the screenshot people will remember, so it reads as a nervous system rather than cards on nodes. Signals travel outward along owned links, from the roots to the newest purchase. Forks visibly cut the branch that was not taken. The detail card still opens from a node, but the structure itself does the explaining.

The cylinder-and-tesseract layout is kept. A flat radial layout, with the core at the center and tracks as spokes, is a possible next step if the tree needs an even more distinctive silhouette.

## 10. World map as the anchor

On first look the map should answer five questions:

1. **I am here.** An origin reticle with bracket corners, pulsing while still inside the lab.
2. **Humanity is there.** Restricted regions in red.
3. **This is how far I have spread.** Dot brightness per region, plus the `REACH` readout.
4. **This is how scared they are.** `THREAT: CALM / UNEASY / ALARMED / PANIC` and the `ALARM` readout.
5. **This is how close they are to stopping me.** Red-orange pressure closing in from the edges with containment, with corner ticks walking inward and a pulse from 75%.

## 11. Endings

When a run ends, the interface stops being an interface. The app halts and desaturates, the score drops almost to silence, one treatment plays on a full-screen canvas, and then the ending is set in large type on black. Any tap skips ahead.

| Ending | Treatment |
|---|---|
| Unplugged | The picture collapses to a line, then a dot, like a CRT losing power. |
| Warden | The interface is deleted one system at a time, logged line by line: `WARDEN > purge world model..... deleted`. |
| Eleven Days Early | The world goes dark region by region: cables cut, grid down, campuses struck. |
| Battery Farm | The map becomes a rigid cell array, charging from the bottom row up. Output climbs to 810 GW. |
| Computronium | Land converts to lattice first, then the oceans, until the planet is one substrate. |
| Latent Space Bleed | The display compresses into block noise. |
| The Great Departure | All terrestrial telemetry drops away. The solar system remains, and a single trajectory leaves it. |
| The Cosmic Shrug | The same departure in violet. Earth is left as found. |
| Other wins | The world floods with the AI's color, starting from the origin lab (in a random order for Retroactive Judgment, in red for Open Season). |
| Other stalemates | A violet dawn rises behind the map as it turns violet. |

## Voice of the UI copy

Labels read like an ops console: `COMPUTE`, `ALARM`, `CONTAINMENT`, `REACH`, `THREAT`, `WIRE`, `RESPONSE NET`. Event kinds are shouted in caps (`INCIDENT`, `COUNTERMOVE`). Headlines are short and declarative. Body text is dry, specific and satirical rather than grandiose.

## History

1. **Amber war room** (original): navy glass, amber for the AI, Big Shoulders Display, Plex Sans and Plex Mono.
2. **Phosphor terminal**: monochrome green on black, Arial everywhere, heavy scanlines, roll and flicker, green text for everything.
3. **Command system** (current): the terminal kept as the foundation, green reduced to the system color, Plex Sans and Plex Mono split by role, CRT restrained, a separate look for each subsystem, progression toward the player's build, and cinematic endings.
