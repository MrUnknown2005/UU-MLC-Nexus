# UU MLC Nexus Design System

## Product character

UU MLC Nexus should feel like a focused university club workspace: modern, technical, confident, and welcoming. The interface should prioritize clarity and task completion over decoration.

## Visual principles

1. **Hierarchy before effects** — headings, actions, status, and content must remain clear without relying on glow or gradients.
2. **One primary action** — each surface should have one visually dominant action; secondary actions stay quieter.
3. **Controlled color** — yellow is the primary action/accent color. Purple, cyan, pink, and emerald are supporting semantic accents, not competing primary CTAs.
4. **Glass as structure** — glass panels group information; they should not be used on every nested element.
5. **Consistent rhythm** — use predictable spacing and aligned content rather than arbitrary gaps.
6. **States are designed** — loading, empty, error, success, disabled, and focus states are first-class UI states.
7. **Responsive by default** — important actions and information must remain usable at narrow widths.

## Color roles

- **Background:** near-black / deep neutral
- **Primary:** warm yellow for primary actions and important emphasis
- **Secondary:** violet for identity and selected navigation
- **Informational:** cyan for informational data
- **Success:** emerald for successful states
- **Danger:** red for destructive/error states
- **Text:** white for primary, cool gray for secondary, muted gray for metadata

Avoid introducing a new accent color unless it has a clear semantic role.

## Typography

- Use the native system sans-serif stack (`--font-sans`); no webfonts.
- Headings should use strong weight and tight tracking.
- Body copy should favor readable line-height over excessive density.
- Labels and metadata may use uppercase tracking sparingly.

## Components

### Buttons

- Primary: filled yellow treatment.
- Secondary: glass/outlined treatment.
- Destructive: reserved for irreversible actions.
- Every interactive button needs visible hover, focus-visible, disabled, and loading behavior where applicable.

### Forms

- Every input needs an accessible label or equivalent accessible name.
- Errors should be associated with the relevant field when practical.
- Never rely on placeholder text as the only label.

### Cards

Use cards to group a meaningful unit of information. Avoid excessive nested cards and decorative containers.

### Navigation

Navigation should communicate the current location clearly and keep destructive/account actions visually separate from primary navigation.

## Accessibility baseline

- Keyboard navigation must remain possible.
- Interactive elements require a visible `:focus-visible` state.
- Text and controls must maintain sufficient contrast.
- Decorative imagery must use empty alt text; informative imagery must have descriptive alt text.
- Respect `prefers-reduced-motion` for non-essential animation.

## Responsive baseline

- Minimum supported viewport: 320px.
- Avoid horizontal scrolling for normal application flows.
- At mobile widths, prioritize primary navigation, primary action, and core content over decorative elements.

## Implementation rule

Prefer existing Nexus utility/component classes before adding one-off styles. New visual primitives should be added to the shared design system when they are reused across multiple surfaces.
