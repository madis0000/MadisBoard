# MadisBoard - Claude Code Project Guide

## Project Overview

MadisBoard (formerly AFFiNE) is a privacy-focused, local-first, open-source workspace platform combining docs, canvas/whiteboard, and databases. It's a fork of [AFFiNE](https://github.com/toeverything/AFFiNE) rebranded for self-hosted deployment at madis-labs.com.

**Key Principles:**
- Local-first: Data stored locally, cloud sync optional
- CRDT-based collaboration (Yjs)
- Multi-platform: Web, Desktop (Electron), Mobile (React Native)
- Modular architecture with 50+ feature modules

## Repository Structure

```
MadisBoard/
├── blocksuite/              # Collaborative editor framework (submodule)
├── packages/
│   ├── backend/
│   │   ├── native/          # Rust server-native bindings (NAPI.rs)
│   │   └── server/          # NestJS backend (GraphQL, PostgreSQL, Redis)
│   ├── frontend/
│   │   ├── apps/
│   │   │   ├── web/         # Web SPA entry point
│   │   │   ├── electron/    # Electron main process
│   │   │   ├── electron-renderer/  # Electron renderer
│   │   │   └── mobile/      # React Native app
│   │   ├── core/            # Core frontend logic (largest package)
│   │   ├── component/       # Reusable UI component library
│   │   ├── native/          # Rust frontend-native bindings (SQLite, etc.)
│   │   ├── i18n/            # Internationalization
│   │   ├── routes/          # Route definitions
│   │   └── track/           # Analytics/tracking
│   └── common/
│       ├── infra/           # Infrastructure utilities (Jotai-based stores)
│       ├── env/             # Environment configuration
│       ├── graphql/         # Shared GraphQL schema & types
│       ├── nbstore/         # Network-based store abstraction
│       └── y-octo/          # Rust CRDT implementation
├── tools/
│   ├── cli/                 # @madisboard-tools/cli (build & bundle)
│   └── utils/               # Shared dev utilities
├── tests/                   # E2E tests (Playwright)
│   ├── affine-local/        # Local mode tests
│   ├── affine-cloud/        # Cloud mode tests
│   └── affine-desktop/      # Desktop app tests
└── docs/                    # Development documentation
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend UI | React 19, Vanilla Extract, Radix UI, Tailwind CSS 4 |
| State | Jotai (atoms), Preact Signals, GraphQL (server state) |
| Collaboration | Yjs CRDT, Socket.io |
| Editor | BlockSuite (custom framework) |
| Backend | NestJS, Apollo Server (GraphQL), Prisma ORM |
| Database | PostgreSQL + pgvector (server), SQLite (client), IndexedDB (browser) |
| Cache/Queue | Redis, BullMQ |
| Desktop | Electron 39 with Electron Forge |
| Mobile | React Native (iOS/Android) |
| Native | Rust with NAPI.rs bindings |
| Build | Webpack 5, Vite 7, SWC |
| Package Manager | Yarn 4.12.0 (workspaces) |
| Testing | Vitest (unit), Playwright (E2E), AVA (backend) |
| Linting | ESLint 9, Prettier, Oxlint, TypeScript strict |

## Development Commands

```bash
# Install dependencies
yarn install

# Build native modules (requires Rust toolchain)
yarn affine @affine/native build          # Frontend native
yarn affine @affine/server-native build   # Server native

# Development
yarn dev                    # Start dev server (web frontend)
yarn affine dev             # Same as above
yarn affine server dev      # Start backend server

# Building
yarn build                  # Production build
yarn affine build           # Same as above

# Testing
yarn test                   # Unit tests (Vitest)
yarn test:ui                # Interactive test UI
yarn test:coverage          # With coverage

# Linting & Type Checking
yarn typecheck              # TypeScript type checking
yarn lint                   # ESLint + Prettier
yarn lint:fix               # Auto-fix
yarn lint:ox                # Oxlint (fast)

# Server-specific
yarn affine server init     # Initialize DB (run after migration changes)
yarn affine server prisma studio  # Database GUI at localhost:5555
yarn affine server seed -h  # Seed database
```

## Server Dev Setup

Requires Docker services: PostgreSQL (pgvector), Redis, Mailhog.

```bash
cp .docker/dev/compose.yml.example .docker/dev/compose.yml
cp .docker/dev/.env.example .docker/dev/.env
docker compose -f .docker/dev/compose.yml up
```

Default test users (after `yarn affine server dev`):
- `dev@affine.pro` / `dev` (free tier, 3 workspace members)
- `pro@affine.pro` / `pro` (pro tier, 10 members)
- `team@affine.pro` / `team` (team tier, team workspace)

## Code Conventions

### Package Naming
- Frontend packages: `@madisboard/<name>` (e.g., `@madisboard/core`, `@madisboard/component`)
- Common packages: `@toeverything/<name>` (e.g., `@toeverything/infra`)
- Tools: `@madisboard-tools/<name>`
- Test workspaces: `@affine-test/<name>`

### File Patterns
- Components: `*.tsx` with co-located `.css.ts` (Vanilla Extract styles)
- Tests: `*.spec.ts` / `*.spec.tsx` (unit), `*.e2e.ts` (E2E)
- Modules: Each in `packages/frontend/core/src/modules/<name>/`
- Backend modules: NestJS pattern with `.module.ts`, `.service.ts`, `.resolver.ts`

### State Management Pattern
- UI state: Jotai atoms (local component state)
- Reactive state: Preact Signals
- Server state: GraphQL + SWR hooks
- Collaborative state: Yjs documents
- Persistence: IndexedDB (browser) / SQLite (desktop)

### Styling
- Primary: Vanilla Extract (`.css.ts` files, zero-runtime CSS-in-JS)
- Utility: Tailwind CSS
- Component library: `packages/frontend/component/`
- Theme: `packages/common/theme/`

### Import Organization
Uses `eslint-plugin-simple-import-sort`:
1. External packages
2. `@madisboard/*` / `@toeverything/*` packages
3. Relative imports

## Architecture Patterns

### Frontend Core Modules
Located in `packages/frontend/core/src/modules/`. Each module typically contains:
- `index.ts` - Public API exports
- `services/` - Business logic services
- `views/` - React components
- `entities/` - Data models
- `stores/` - Jotai atoms / state

### BlockSuite Editor Integration
- `packages/frontend/core/src/blocksuite/` - Integration layer
- `blocksuite/affine/blocks/` - Block implementations (paragraph, code, image, database, etc.)
- `blocksuite/affine/widgets/` - Interactive widgets
- `blocksuite/framework/store/` - Yjs-backed document store

### Backend Plugin System
- `packages/backend/server/src/plugins/` - Extensible plugins
- `copilot/` - AI/LLM integration (Anthropic, OpenAI, Google)
- GraphQL resolvers for API
- Prisma for database migrations

### Native Bindings (Rust)
- Built with NAPI.rs for Node.js integration
- Frontend: SQLite, file I/O, media processing
- Backend: Server utilities, performance-critical operations
- Common: Y-Octo CRDT, sync protocols

## Branching & Git

- **Main development branch:** `canary`
- **Current working branch:** `main-madisboard`
- **Commit style:** Conventional commits (`feat:`, `fix:`, `style:`, `refactor:`, etc.)
- **Pre-commit hooks:** Prettier formatting, ESLint fixes via Husky + lint-staged

## Key Considerations

1. **Rebranding**: The project was rebranded from AFFiNE to MadisBoard. Some internal references may still use `affine` (especially in test workspace names, upstream dependencies, and blocksuite).

2. **Windows Development**: Requires Developer Mode enabled for symbolic links. Use `git config --global core.symlinks true`.

3. **Rust Toolchain**: Required for native module builds. Install via rustup.

4. **Node.js Version**: Must be < 23.0.0 (LTS recommended, currently 20.x or 22.x).

5. **Database Migrations**: After pulling new migration changes, run `yarn affine server init`.

6. **BlockSuite**: The editor framework is a git submodule. Changes to it may require rebuilding.

7. **Self-hosting**: Docker configurations in `.docker/selfhost/` for production deployment.

## Common Tasks

### Adding a New Frontend Module
1. Create directory: `packages/frontend/core/src/modules/<name>/`
2. Define services, views, entities as needed
3. Export from `index.ts`
4. Register in the module system

### Adding a GraphQL Endpoint
1. Define schema in `packages/common/graphql/`
2. Implement resolver in `packages/backend/server/src/core/` or relevant plugin
3. Generate types with GraphQL codegen

### Running E2E Tests Locally
```bash
npx playwright install        # Install browsers
yarn affine server dev        # Start backend
yarn dev                      # Start frontend
yarn workspace @affine-test/affine-local e2e  # Run tests
```

### Building Desktop App

**Prerequisites:**
1. Node.js < 23.0.0 (LTS recommended)
2. Rust toolchain (`rustup`, `cargo`, `rustc`)
3. Windows: Visual Studio Build Tools with C++ workload
4. macOS: Xcode Command Line Tools

**Build Steps:**
```bash
# 1. Install dependencies
yarn install

# 2. Build native modules (REQUIRED before Electron build)
yarn affine @affine/native build

# 3. Build Electron app (choose one):
yarn affine @affine/electron build          # Main process
yarn affine @affine/electron-renderer build # Renderer

# 4. Package for distribution
NODE_OPTIONS="--max-old-space-size=16384" yarn affine electron-forge:package  # Unpacked
NODE_OPTIONS="--max-old-space-size=16384" yarn affine electron-forge:make     # Installer

# Quick dev mode (runs without full packaging)
yarn workspace @affine/electron dev
```

**Troubleshooting Desktop Builds:**
- Use `/diagnose-build desktop` to systematically check for issues
- Use `/debug-electron` for runtime problems
- See `docs/building-desktop-client-app.md` for platform-specific details

---

## Agent System

MadisBoard has a comprehensive agent system for code review, debugging, and development assistance. Agents are specialized AI personas with deep knowledge of specific domains.

### Available Agents (`.claude/agents/`)

| Agent | Domain | Use For |
|-------|--------|---------|
| **architect** | System design | Module boundaries, dependencies, patterns |
| **backend** | Server-side | NestJS, GraphQL, Prisma, Redis |
| **build** | Build system | Webpack, TypeScript, native modules, packaging |
| **code-reviewer** | Code quality | General review, conventions, type safety |
| **collaboration** | Real-time sync | Yjs CRDT, awareness, conflict resolution |
| **desktop** | Electron | IPC, native integration, desktop packaging |
| **devops** | Infrastructure | Docker, CI/CD, deployment |
| **frontend** | React/UI | Components, state, styling, BlockSuite |
| **i18n** | Translations | Localization, RTL, number/date formatting |
| **mobile** | React Native | iOS/Android, mobile-specific concerns |
| **performance** | Optimization | Rendering, memory, network, database |
| **security** | Vulnerabilities | Auth, injection, Electron security |
| **testing** | Tests | Vitest, Playwright, test patterns |
| **ux** | User experience | Interactions, feedback, accessibility |
| **web** | Browser/PWA | Web APIs, offline, performance |

### Available Commands (`.claude/commands/`)

| Command | Purpose |
|---------|---------|
| `/check-build` | Run typecheck and lint |
| `/debug-electron` | Diagnose Electron runtime issues |
| `/dev-setup` | Verify development environment |
| `/diagnose-build` | Systematic build failure diagnosis |
| `/docker-status` | Check Docker services status |
| `/find-usage <symbol>` | Find all usages of a symbol |
| `/new-module <name>` | Create a new frontend module |
| `/review [scope]` | Multi-agent code review |
| `/test-module <name>` | Run tests for a module |

### Agent Orchestration

When working on complex tasks, multiple agents should be consulted based on the domain:

**Desktop/Electron Issues:**
1. Start with **build** agent for build failures
2. Use **desktop** agent for Electron-specific issues
3. Include **security** agent for IPC/native security
4. Add **performance** agent for startup/memory issues

**Frontend Development:**
1. **frontend** agent for React/state issues
2. **ux** agent for user-facing changes
3. **performance** agent for render optimization
4. **testing** agent for component tests

**Backend Development:**
1. **backend** agent for API/database work
2. **security** agent for auth/input validation
3. **performance** agent for query optimization
4. **devops** agent for deployment concerns

**Code Review (`/review`):**
The review orchestrator automatically selects relevant agents based on the files changed and compiles a comprehensive report with severity-ranked findings.

### Triggering Agent Analysis

Agents can be invoked in several ways:

1. **Slash commands**: `/review staged`, `/diagnose-build desktop`
2. **Direct request**: "Review this from a security perspective"
3. **Problem description**: "The desktop build is failing" → triggers build + desktop agents
4. **Auto-selection**: Claude automatically uses relevant agents based on context

### Build Order Reference (Desktop)

For a clean desktop build, follow this order:

```bash
# 1. Clean slate (if issues persist)
rm -rf node_modules packages/*/node_modules packages/*/*/node_modules

# 2. Install dependencies
yarn install

# 3. Build native modules
yarn affine @affine/native build

# 4. Type check (catch issues early)
yarn typecheck

# 5. Build web/renderer assets
yarn affine @affine/electron-renderer build

# 6. Build main process
yarn affine @affine/electron build

# 7. Package
NODE_OPTIONS="--max-old-space-size=16384" yarn affine electron-forge:package
```

### Environment Variables for Builds

| Variable | Purpose | Values |
|----------|---------|--------|
| `BUILD_TYPE` | Build variant | `canary`, `beta`, `stable` |
| `DISTRIBUTION` | Target platform | `web`, `desktop`, `mobile` |
| `NODE_OPTIONS` | Node.js memory | `--max-old-space-size=16384` |
| `SKIP_WEB_BUILD` | Skip web in electron | `1` |
| `HOIST_NODE_MODULES` | Flatten modules | `1` |
| `ELECTRON_ENABLE_LOGGING` | Debug logging | `1` |
