# Find Usage

Find all usages of a symbol, component, function, or pattern across the codebase.

## Arguments

- $ARGUMENTS: The symbol/function/component name to search for

## Steps

1. Search for the symbol across the codebase using grep/glob
2. Categorize results by:
   - Definition (where it's declared)
   - Imports (where it's imported)
   - Usage (where it's actually used)
3. Report file locations with line numbers
4. Note any patterns in how it's used (props passed, context, etc.)

Exclude `node_modules/`, `dist/`, `.yarn/`, and build artifacts from search.
