# Test Module

Run tests for a specific module or package.

## Arguments

- $ARGUMENTS: The module/package name or path to test (e.g., "core", "component", "backend/server", or a specific test file path)

## Steps

1. Determine the correct test command based on the argument:
   - For frontend packages: `yarn test --run <path>`
   - For backend: `yarn workspace @affine/server test`
   - For E2E: `yarn workspace @affine-test/<name> e2e`
   - For specific files: `yarn test --run <file-pattern>`

2. Run the tests and report results

3. If tests fail, analyze the failures and suggest fixes
