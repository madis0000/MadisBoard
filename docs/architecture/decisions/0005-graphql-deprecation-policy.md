# ADR-0005: GraphQL Schema Deprecation Policy

## Status
Accepted

## Context
The GraphQL API serves multiple client versions (web, desktop, mobile). Breaking schema changes can simultaneously break all connected clients. A structured deprecation policy is needed.

## Decision
We adopt the following GraphQL deprecation workflow:

### 1. Deprecation Period
- Fields/queries/mutations must be deprecated for **at least 2 release cycles** before removal.
- Use the `@deprecated(reason: "Use X instead. Removal target: vX.Y.Z")` directive.

### 2. Process
1. **Mark deprecated**: Add `@deprecated` with migration path and target removal version.
2. **Add replacement**: New field/query must exist before deprecation of the old one.
3. **CI enforcement**: Run schema diff in CI to flag breaking changes (field removals, type changes).
4. **Monitor usage**: Track deprecated field usage via GraphQL middleware before removal.
5. **Remove**: After 2+ release cycles with <1% usage, remove the deprecated field.

### 3. Schema Diff CI Check
```yaml
# .github/workflows/schema-check.yml
- name: Check GraphQL Schema
  run: |
    npx graphql-inspector diff \
      origin/main:packages/backend/server/src/schema.gql \
      packages/backend/server/src/schema.gql \
      --rule suppressRemovalOfDeprecatedField
```

### 4. Existing Deprecations
The codebase already uses `deprecationReason` in some resolvers (e.g., `collectAllBlobSizes`, `getBlobUploadPartUrl`). This policy formalizes the practice.

## Consequences
- **Positive**: Clients have time to migrate. Breaking changes are visible in CI. Usage tracking prevents premature removal.
- **Negative**: Deprecated code accumulates temporarily. Developers must maintain both old and new implementations during the transition period.
