# ADR-0004: Use Vanilla Extract for Styling

## Status
Accepted

## Context
The frontend needs a styling solution that supports:
- Type-safe CSS with TypeScript
- Theme variables (dark/light mode)
- Zero runtime overhead for production
- Component-level scoping without class name conflicts

Alternatives considered: Tailwind CSS, styled-components, CSS Modules, Emotion.

## Decision
We use **Vanilla Extract** with the following patterns:

1. **CSS-in-TS files** (`.css.ts`): Styles defined as TypeScript, compiled to CSS at build time.
2. **CSS Variables**: Theme tokens exposed via `cssVar()` and `cssVarV2()` from `@toeverything/theme`.
3. **Dynamic styling**: `assignInlineVars()` for runtime CSS variable assignment.
4. **Data attributes**: Component variants via `data-variant`, `data-size` selectors.

## Consequences
- **Positive**: Zero runtime CSS overhead. Full TypeScript autocompletion. Theme variables automatically typed. Build-time validation catches CSS errors.
- **Negative**: Requires build step. Dynamic styles limited to CSS variables (no arbitrary runtime CSS). Learning curve for developers familiar with Tailwind or styled-components.
- **Mitigation**: Storybook provides visual component documentation. Dynamic needs handled via `assignInlineVars`.
