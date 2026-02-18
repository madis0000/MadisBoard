# Diagnose Build Issues

Systematically diagnose and fix build failures across the MadisBoard monorepo.

## Arguments

- $ARGUMENTS: Optional build target or error message to focus on:
  - "desktop" / "electron" — Focus on Electron build
  - "web" — Focus on web build
  - "native" — Focus on Rust/NAPI builds
  - "all" — Check entire build pipeline
  - An error message — Diagnose specific error

## Diagnostic Process

### 1. Environment Check

Run these checks in parallel:

- Node.js version: `node --version` (should be < 23.0.0)
- Yarn version: `yarn --version` (should be 4.x)
- Rust toolchain: `rustc --version && cargo --version`
- Docker (if needed): `docker ps`

### 2. Dependency State

- Check `yarn install` status (are node_modules valid?)
- Verify workspace resolution: `yarn workspaces list`
- Check for lockfile integrity issues

### 3. Native Modules

- Check if `@affine/native` is built: test with `node -e "require('@affine/native')"`
- Check if `@affine/server-native` is built (if doing backend)
- Look for common native build errors (missing Visual Studio Build Tools on Windows, missing Xcode CLI tools on macOS)

### 4. TypeScript Resolution

- Run `yarn typecheck` to find type errors
- Check for missing type definitions
- Verify tsconfig project references

### 5. Build Target Analysis

Based on the target:

**For Desktop/Electron:**

- Verify Electron version: `npx electron --version`
- Check forge.config.mjs configuration
- Verify renderer is built before main
- Check for platform-specific resource files
- Test that preload scripts are bundled correctly

**For Web:**

- Check webpack configuration
- Verify public path settings
- Check for bundle size issues
- Verify environment variables are injected

**For Native:**

- Check Cargo.toml dependencies
- Verify NAPI bindings are generated
- Check for correct Node ABI version

### 6. Generate Fix Report

Output a structured report:

```
## Build Diagnosis Report

### Environment
- Node: ✓/✗ (version)
- Yarn: ✓/✗ (version)
- Rust: ✓/✗ (version)
- Docker: ✓/✗ (if needed)

### Dependencies
- Status: ✓/✗
- Issues: (list any)

### Native Modules
- @affine/native: ✓/✗
- @affine/server-native: ✓/✗ (if relevant)

### TypeScript
- Type errors: (count)
- Critical issues: (list)

### Target-Specific ([target])
- Issues found: (list)

### Root Cause
(Most likely cause of failure)

### Fix Steps
1. (First step)
2. (Second step)
...

### Verification
(Command to verify fix worked)
```

## Common Fix Sequences

### Clean Rebuild

```bash
# Full clean rebuild
rm -rf node_modules
rm -rf packages/*/node_modules
rm -rf packages/*/*/node_modules
yarn install
yarn affine @affine/native build
yarn build
```

### Electron-Specific Rebuild

```bash
yarn affine @affine/native build
yarn affine @affine/electron build
yarn affine @affine/electron-renderer build
yarn affine electron-forge:package
```

### Fix Native Module ABI

```bash
npx electron-rebuild
# or
yarn affine @affine/native build
```

## Escalation

If diagnosis doesn't identify the issue:

1. Ask user to share the full error output
2. Check recent changes to build configuration (git diff)
3. Search for similar issues in upstream AFFiNE repository
4. Invoke the Build Agent for deeper analysis
