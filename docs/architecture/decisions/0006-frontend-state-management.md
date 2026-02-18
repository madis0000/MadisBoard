# ADR-0006: Multi-Layer Frontend State Management

## Status
Accepted

## Context
The frontend application manages diverse types of state:
- Collaborative document content (must sync across users in real-time)
- Server-derived data (user profiles, workspace metadata, feature flags)
- Reactive service state (editor lifecycle, theme, navigation)
- Ephemeral UI state (modal open/close, form inputs, local toggles)

No single state management solution handles all cases optimally.

## Decision
We use a **four-layer state architecture**, each chosen for its specific strength:

### Decision Tree

```
Is the data collaboratively edited / requires offline-first persistence?
  → YES: Use Yjs (CRDT)
    Examples: Document content, whiteboard state, database rows

Is the data fetched from the server and needs caching/revalidation?
  → YES: Use SWR (useSWR / useSWRMutation)
    Examples: User profile, workspace list, feature flags, quota info

Is the data reactive, long-lived, and part of a service lifecycle?
  → YES: Use RxJS + LiveData (via @toeverything/infra)
    Examples: Editor state, doc sync status, workspace loading, theme

Is the data ephemeral, UI-only, and component-scoped?
  → YES: Use Jotai atoms
    Examples: Modal visibility, sidebar state, share menu toggle
```

### Integration Patterns:

1. **Yjs → RxJS**: Use `yjsObserve()`, `yjsObservePath()` to convert Y.Doc changes into RxJS Observables.
2. **SWR → React**: Use `useSWR()` with Suspense mode. Errors handled via `SWRErrorBoundary`.
3. **RxJS → React**: Use `useLiveData()` hook to subscribe to `LiveData<T>` in components.
4. **Jotai → React**: Use `useAtom()` from jotai for local UI state.

### Anti-Patterns to Avoid:
- Don't use Jotai for data that needs server synchronization (use SWR).
- Don't use SWR for collaborative data (use Yjs).
- Don't subscribe to RxJS Observables directly in components (use `useLiveData()`).
- Don't store component-specific toggle state in services (use Jotai atoms).

## Consequences
- **Positive**: Each layer is optimized for its use case. Clear boundaries prevent misuse. Performance is excellent (Yjs for collaboration, zero-runtime CSS, SWR caching).
- **Negative**: Four state systems increase onboarding complexity. Developers must learn the decision tree. Debugging state issues may require understanding multiple systems.
- **Mitigation**: This ADR serves as the decision guide. Services follow the `Store`/`Entity` pattern from `@toeverything/infra` for consistency.
