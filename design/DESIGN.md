# AI Ascendancy: Design Theme

Extracted from `index.html`. The portable version of everything below lives in [`theme.css`](theme.css).

## The idea in one line

**A war-room terminal watched by the thing it was built to contain.** Near-black navy glass, one hot amber signal for the AI, and a ring of cold colors for the world pushing back. The look sits between a military HUD, a satellite ops console, and a Plague Inc. map screen.

## Principles

1. **Amber means the AI.** The player's power, the brand, the primary button, and every "you can do this now" state use `--ai` amber. Nothing else gets to be amber.
2. **Color is meaning.** Every other hue is tied to a faction or event kind (alarm red, containment blue, opportunity green). Color never decorates.
3. **Three voices of type.** Condensed display caps shout headlines. Mono caps whisper labels and numbers like a system log. Plex Sans carries the actual reading.
4. **Thin lines, flat panels.** 1px borders, small radii, no gradients on controls. Depth comes from stacked navy tones, not shadows. Shadows appear only on things that float (toasts, sheets, modals).
5. **Outlined, not filled.** Chips, badges, and status tags are colored text on a colored border. Solid fill is reserved for the primary action and owned upgrades.
6. **Dark only.** `color-scheme: dark`. There is no light theme; the game is set at night in a server room.

## Color

### Surfaces (darkest to lightest)

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#07090E` | Page, theme-color, favicon ground |
| `--bg2` | `#0B0F17` | Header, dock, ticker, report boxes |
| `--panel` | `#0F141D` | Sheets, modals, region tiles, toasts |
| `--panel2` | `#151C27` | Cards, buttons, bar tracks |
| `--line` | `#1F2A3A` | Default 1px border |
| `--line2` | `#2C3A4E` | Control borders, stronger dividers |

### Text

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#ECE7DA` | Primary text. A warm off-white, like paper under a monitor. |
| `--ink2` | `#B9BFCB` | Body copy, descriptions |
| `--mute` | `#7C8698` | Labels, meta, timestamps |
| `#3A4658` | | Closed / dead upgrades |

### The AI (brand)

| Token | Hex | Use |
|---|---|---|
| `--ai` | `#FFB02E` | Brand name, compute counter, primary button, focus ring, "affordable" |
| `--ai2` | `#FFD98A` | Directive, pace, origin lab, outcomes |
| `--ai-dim` | `#8A5E14` | Amber borders, corner brackets, rules |
| text on amber | `#1A1200` | Always use this near-black on amber fills, never white |

### Factions and event kinds

| Token | Hex | Means | Event kind |
|---|---|---|---|
| `--alarm` | `#F0435A` | Danger, restriction, live feed | `INCIDENT` |
| `--human` | `#4F8DF7` | Humanity, containment | `COUNTERMOVE` |
| `--good` | `#4FD1A1` | Success, data centers online, owned | `OPPORTUNITY` |
| `--opinion` | `#F472B6` | Public opinion track | `SMOOTHING` |
| `--software` | `#A78BFA` | Software track, the Collective | |
| `--hardware` | `#B5E655` | Hardware track | `HARDWARE` |
| `--draw` | `#C9A3FF` | Stalemate line, draw endings | `DRAW` |

Tinted borders use the hue at 50 to 60% alpha (`rgba(240,67,90,.5)`). Tinted backgrounds go no higher than 7% (`rgba(240,67,90,.07)`).

## Typography

| Role | Family | Treatment |
|---|---|---|
| Display | **Big Shoulders Display** 700–800 | Uppercase, tracking `.02–.06em`, line-height `.92–1.05`. Headlines, buttons, tabs, card names, the big compute number. |
| Body | **IBM Plex Sans** | 14px base, line-height 1.45. Descriptions at 12.5–13px in `--ink2`, capped at 52–62ch. |
| Mono | **IBM Plex Mono** | 9.5–12px, uppercase, tracking `.08–.14em`, `tabular-nums`. Labels, chips, stats, timestamps, boot logs. |

Fallbacks: Arial Narrow / Roboto Condensed for display, system-ui for body, ui-monospace for mono. The game embeds all three as base64 woff2 so it works offline.

Scale in practice: 52 / 42 / 38 / 26 / 22 / 17 / 15 on display; 14.5 / 14 / 13 / 12.5 / 12 on body; 12 / 11.5 / 11 / 10 / 9.5 on mono. Titles use `clamp(28px, 9vw, 42px)`.

## Shape

- **Radii:** 2–3px tags and bars, 4px cards and panels, 6px buttons and icon buttons, 10–12px modals and the tech card. Circles only for tech-tree nodes and dots.
- **Borders:** always 1px, except 2px for log-entry rules and tree nodes, 3px for toast accent rules. Dashed means owned or locked.
- **Corner brackets:** 9px amber-dim L-shapes on the four corners of the map frame. This is the signature HUD touch.
- **Spacing:** 12px page gutter, 6–10px gaps between tiles and cards, 44px minimum touch target.

## Components

- **Button:** Display caps on `--panel2` with a `--line2` border. Primary is solid amber with `#1A1200` text. Danger is red text on a red-tinted border. Presses drop 1px.
- **Chip / kind badge:** Mono 10px caps, outlined in the kind's color.
- **Gauge:** Mono label row (name left, value right) over a 5px bar. Critical values turn the value red. A 2px violet tick marks the stalemate line.
- **Region tile:** Panel with a small name, a mono percentage, a bar, and a status tag top-right. A 2px inset bottom rule shows data-center state (green online, amber rebuilding, red offline).
- **Card:** Display-caps name, mono cost pill, Plex description, row of mono effect tags. Affordable cards borrow their track color for the border.
- **Log entry / toast:** A colored left rule names the event kind. Display-caps headline, body in `--ink2`, mono outcome line in `--ai2`.
- **Notice:** Red-tinted box with a mono red label.
- **Boot log:** Mono lines on an amber-dim left rule, fading in 0.4s apart. Highlights in amber.
- **Sheet / modal:** Bottom sheet on phones, centered modal from 600px up, over a 74% black scrim with a 6px blur.

## Motion

- Easing: `cubic-bezier(.2,.8,.2,1)` for sheets and cards; an overshoot `cubic-bezier(.3,1.4,.5,1)` only for the dice.
- Durations: 80ms press, 150–250ms fades, 280–340ms sheets, 450ms bar fills.
- Pulses: affordable tech nodes breathe a ring at 1.5s; online data centers blink a stepped LED at 1.6s.
- `prefers-reduced-motion` switches the looping animations off.

## Iconography and marks

- Favicon: amber dot inside a faint amber ring on a `#07090E` rounded square. The mark is a signal, or an eye.
- Icons are Unicode glyphs (❚❚ ♪ ♫ ≡ ◇) and tiny inline SVG, not an icon font.

## Voice of the UI copy

Labels read like an ops console: `COMPUTE`, `ALARM`, `CONTAINMENT`, `REACH`, `LIVE`. Event kinds are shouted in caps (`INCIDENT`, `COUNTERMOVE`). Headlines are short and declarative. Body text is dry, specific, and satirical rather than grandiose.
