# UU MLC Nexus — Premium Design System

## Product character

Nexus is a living club operating system: cinematic, technical, confident, warm, and unmistakably UU MLC. It should never read as a generic SaaS dashboard.

## Visual identity

- **Primary identity:** Nexus Gold `#FFD84A`
- **Hot gold:** Amber `#FFAD00`
- **Base:** Obsidian `#060606`
- **Surfaces:** warm graphite glass with restrained highlights
- **Secondary data accents:** violet and electric blue, used sparingly
- **Brand mark:** the existing UU MLC club logo is the source of truth and must not be replaced by generated artwork.

## Type scale

- Display: `clamp(2.5rem, 5vw, 5rem)` with tight tracking
- Page title: `clamp(2rem, 4vw, 3.5rem)`
- Section title: `1.25rem–1.75rem`
- Body: `0.95rem–1rem`
- Metadata: `0.68rem–0.78rem` with restrained tracking

## Motion and interaction

- The application environment has a subtle pointer-reactive spotlight and parallax grid.
- Ambient orbs move slowly to provide life without distraction.
- Route content enters with a short opacity/translate/blur transition.
- Interactive surfaces lift subtly and reveal a gold edge on hover.
- Active navigation gets a persistent gold rail and soft illumination.
- Every animated treatment has a `prefers-reduced-motion` fallback.

## Layout principles

1. Hierarchy before effects.
2. Use large breathing room around primary content.
3. Prefer meaningful visual zones over repetitive card grids.
4. Gold is reserved for identity, primary actions, focus, points, and important states.
5. Glass groups information; it should not wrap every nested element.
6. Every interactive control needs clear hover, focus, active, disabled and loading states where relevant.
7. Responsive behavior is designed from 320px upward.

## Engineering guardrails

- Visual redesigns must not change authentication, Supabase access, permissions, routing, or business logic unless explicitly required.
- Preserve the real UU MLC logo.
- Never let animation block input, scrolling, or keyboard navigation.
- Keep contrast and focus states accessible.
- Validate with lint, tests, build, and browser smoke testing before merge.
