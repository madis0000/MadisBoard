# ADR-0001: Use Yjs CRDT for Real-Time Collaboration

## Status
Accepted

## Context
MadisBoard needs real-time collaborative editing where multiple users can simultaneously edit documents, whiteboards, and databases. The core requirement is eventual consistency without a central conflict resolution authority.

Two primary approaches exist:
- **Operational Transform (OT)**: Used by Google Docs, requires a central server to transform operations.
- **CRDTs (Conflict-free Replicated Data Types)**: Operations commute automatically, enabling true peer-to-peer and offline-first operation.

## Decision
We use **Yjs** as our CRDT implementation, extended with **OctoBase** (Rust) for performance-critical operations.

### Reasons:
1. **Local-first architecture**: Yjs enables offline editing with automatic sync when reconnected.
2. **No central bottleneck**: Unlike OT, CRDT operations merge without server-side transformation.
3. **Ecosystem**: Yjs has mature bindings for ProseMirror, CodeMirror, and our custom BlockSuite editor.
4. **Performance**: OctoBase provides Rust-based CRDT operations for large documents.
5. **Binary encoding**: Yjs uses efficient binary encoding (Y.Doc updates) reducing bandwidth.

## Consequences
- **Positive**: True offline-first, no operational transformation server, peer-to-peer capable.
- **Negative**: CRDT metadata grows over time (tombstones), requiring periodic garbage collection. Document size can be larger than OT equivalents.
- **Mitigation**: We implement snapshot-based compaction and lazy loading of document history.
