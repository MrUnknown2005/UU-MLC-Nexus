# UU MLC Nexus Design System

> This document describes the system as it is actually built. The single
> source of truth for values is `src/styles/tokens.css`; this file explains
> the intent behind them. If the two ever disagree, the tokens win — fix
> this file.

## Product character

UU MLC Nexus should feel like a focused university club workspace: modern, technical, confident, and welcoming. The interface prioritizes clarity and task completion over decoration.

## Visual principles

1. **Hierarchy before effects** — headings, actions, status, and content stay clear through type, weight, and spacing, never through glow or gradients.
2. **One primary action** — each surface has one visually dominant action; secondary actions stay quieter.
3. **One accent** — marigold amber is the *only* decorative/brand accent. Success, danger, warn, and info colors exist to communicate **state**, not to decorate; violet appears only where a semantic role calls for it. Do not introduce a new accent.
4. **Solid surfaces, hairline structure** — information is grouped with solid surfaces (`--surface`, `--well`) and 1px hairlines (`--line`), not glass or blur. The only translucency in the product is the sticky-nav/backdrop veil and modal scrims — standard patterns, not decoration.
5. **Consistent rhythm** — predictable spacing and aligned content rather than arbitrary gaps.
6. **States are designed** — loading, empty, error, success, disabled, and focus states are first-class UI states.
7. **Responsive by default** — important actions and information remain usable from 320px up.

## Theming

The product ships **both a dark and a light theme** from one token set. Everything visual resolves through runtime CSS custom properties, so a single `data-theme` attribute repaints the whole app. Dark is the default surface; light is warm paper with the same amber. A pre-paint inline script in `index.html` applies the saved theme before first paint to avoid a flash.

## Color roles

- **Background:** warm near-black (dark) / warm paper (light) — `--bg`
- **Surfaces:** layered neutrals — `--surface`, `--surface-2`, `--surface-3`, `--well`
- **Brand / primary:** marigold amber (`--brand`) for primary actions and emphasis
- **Text:** `--fg` primary, `--fg-muted` secondary, `--fg-subtle` metadata
- **Hairlines:** `--line`, `--line-strong`
- **State — success:** emerald · **danger:** red · **warn:** amber-gold · **info:** cyan
- **Violet:** reserved for a specific semantic role; not a general accent

Semantic state colors come in `-soft` (fill) and `-line` (border) variants. Avoid using any state color purely decoratively.

## Typography

- One **native system sans stack** (`--font-sans`); **no webfonts**, no third-party font requests.
- Headings differ from body by **weight and tracking only** (see `base.css`), never by family. A separate display+body font pairing is deliberately avoided — `--font-display` aliases the same stack.
- Body copy favors readable line-height over density.
- Labels and metadata use uppercase tracking sparingly (`.nx-eyebrow`).
- A monospace stack (`--font-mono`) is used for numeric/keyboard affordances.

## Components

Build from the shared Nexus utility/component classes (`.nx-panel`, `.nx-card`, `.nx-well`, `.nx-input`, `.nx-nav-item`, `.nx-chip`, …) before adding one-off styles. New visual primitives that get reused belong in the shared layer, not inline.

### Buttons

- Primary: filled amber.
- Secondary: outlined/quiet treatment.
- Destructive: reserved for irreversible actions.
- Every interactive button has visible hover, `:focus-visible`, disabled, and loading behavior where applicable.

### Forms

- Every input needs an accessible label or equivalent accessible name.
- Errors are associated with the relevant field and announced (`role="alert"`).
- Never rely on placeholder text as the only label.

### Cards

Group a meaningful unit of information. Avoid deeply nested cards and decorative containers.

### Navigation

Communicate the current location clearly (the amber active marker is the one decorative flourish in the nav) and keep destructive/account actions visually separate from primary navigation.

## Accessibility baseline

The product targets WCAG 2.1 AA.

- Keyboard navigation is always possible; a skip-link precedes the main content.
- Interactive elements have a visible, branded `:focus-visible` state — never suppressed.
- Text and controls maintain sufficient contrast in both themes (a dedicated `--brand-text` token exists for amber-on-surface text contrast).
- Decorative imagery uses empty `alt`; informative imagery has descriptive `alt`.
- State changes are announced (status messages, filter counts) per WCAG 4.1.3.
- `prefers-reduced-motion` is respected — non-essential animation is reduced to a near-instant paint.

## Responsive baseline

- Minimum supported viewport: 320px.
- No horizontal scrolling for normal application flows (`overflow-x: clip` at the body).
- At mobile widths, primary navigation, primary action, and core content take priority over decorative elements (which may drop out entirely below `lg`).

## What this system deliberately avoids

Because they read as machine-generated template tells:

- Webfonts, or a separate display+body font pairing.
- Gradient/clipped-text headings, glow shadows, glassmorphism cards.
- Multiple competing accent colors.
- Badge-above-headline hero layouts, emoji in headings, decorative colored-border cards.
- Any hardcoded color value in a component — everything routes through tokens.

## Implementation rule

Prefer existing Nexus utility/component classes before adding one-off styles. Reach for a token before a literal value. If a rule seems to need `!important` to win, the component is wrong, not the token.
