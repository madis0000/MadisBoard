# New Frontend Module

Create a new frontend module following the project's established patterns.

## Arguments

- $ARGUMENTS: The module name (e.g., "my-feature")

## Steps

1. Explore existing modules in `packages/frontend/core/src/modules/` to understand the patterns used (look at 2-3 examples for structure)

2. Create the new module directory at `packages/frontend/core/src/modules/<name>/`

3. Create the standard module files following existing conventions:
   - `index.ts` - Public API exports
   - Any services, views, entities, or stores as needed based on the module's purpose

4. Ask the user what the module should do if not clear from the name

5. Ensure proper TypeScript types and imports following project conventions
