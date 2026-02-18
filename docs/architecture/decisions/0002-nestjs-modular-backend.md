# ADR-0002: Use NestJS with Modular Architecture for Backend

## Status
Accepted

## Context
The backend needs to support multiple deployment modes (all-in-one, graphql-only, sync-only, doc-service, renderer) from a single codebase, with dependency injection, GraphQL, WebSocket, and background job processing.

## Decision
We use **NestJS 11** with a custom `AppModuleBuilder` that conditionally loads modules based on server flavor. The architecture follows a layered approach:

- **Base layer**: Cache, Config, Error, Events, Jobs, Metrics, Mutex, Prisma, Redis, Storage
- **Core layer**: Auth, Permissions, Quota, Workspaces, Sync, Doc Storage
- **Plugin layer**: Copilot (AI), Payment, OAuth, Indexer, Calendar

### Module loading is flavor-aware:
```typescript
factor
  .use(...FunctionalityModules)        // Always loaded
  .useIf(() => env.flavors.graphql, GqlModule, CopilotModule, ...)
  .useIf(() => env.flavors.sync, SyncModule)
  .useIf(() => env.flavors.doc, DocServiceModule)
```

## Consequences
- **Positive**: Single codebase, multiple deployment targets. Strong DI enables testing. Module boundaries enforce separation of concerns.
- **Negative**: NestJS decorator-heavy style has a learning curve. Module resolution can be complex for cross-cutting concerns.
- **Mitigation**: Custom `ScannerModule` handles cross-module event wiring.
