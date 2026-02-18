# Review Orchestrator

Perform a comprehensive multi-agent review of code changes by delegating to specialized agents.

## Arguments

- $ARGUMENTS: Scope to review:
  - "staged" — Review git staged changes
  - "branch" — Review all changes vs canary branch
  - "last" — Review the last commit
  - "pr:<number>" — Review a specific PR
  - A file/directory path — Review those files
  - A module name — Review that module

## Available Agents

| Agent             | Focus Area            | Triggers                                             |
| ----------------- | --------------------- | ---------------------------------------------------- |
| **Code Reviewer** | General code quality  | All code changes                                     |
| **Frontend**      | React, state, styling | `.tsx`, `.ts` in `packages/frontend/`, `blocksuite/` |
| **Backend**       | NestJS, GraphQL, DB   | `packages/backend/`                                  |
| **Desktop**       | Electron, IPC, native | `packages/frontend/apps/electron/`                   |
| **Mobile**        | React Native          | `packages/frontend/apps/mobile/`                     |
| **Web**           | Browser, PWA          | `packages/frontend/apps/web/`                        |
| **Security**      | Vulnerabilities       | Auth, crypto, user input, IPC, file access           |
| **Performance**   | Bottlenecks           | Loops, queries, renders, large data                  |
| **Architecture**  | System design         | Cross-module, structural changes                     |
| **UX**            | User experience       | UI components, user flows                            |
| **Build**         | Build system          | Webpack, TypeScript config, native modules           |
| **Testing**       | Test quality          | `*.spec.ts`, `*.spec.tsx`, `*.e2e.ts`                |
| **Collaboration** | CRDT, real-time       | Yjs, sync, awareness code                            |
| **I18n**          | Translations          | i18n resources, `t()` usage                          |
| **DevOps**        | CI/CD, Docker         | `.github/`, `.docker/`, Dockerfile                   |

## Orchestration Process

### 1. Determine Scope

Based on arguments, identify files to review:

- For "staged": `git diff --cached --name-only`
- For "branch": `git diff canary --name-only`
- For "last": `git diff HEAD~1 --name-only`
- For paths: List files in the path

### 2. Classify Changes

Read the diff/files and categorize by:

- File location (which package/module)
- File type (component, service, config, test)
- Content patterns (auth, database, UI, etc.)

### 3. Select Relevant Agents

Based on classification, select agents:

```
Frontend code → Frontend Agent + UX Agent
Backend code → Backend Agent
Electron code → Desktop Agent
Mobile code → Mobile Agent
Web-specific → Web Agent
Auth/crypto → Security Agent (always include for these)
Config changes → Build Agent
Test files → Testing Agent
Sync/CRDT → Collaboration Agent
i18n files → I18n Agent
Docker/CI → DevOps Agent
All code → Code Reviewer Agent
Performance-sensitive → Performance Agent
Structural changes → Architecture Agent
```

### 4. Run Agent Reviews

For each selected agent, use the Task tool to:

- Pass the specific files/diff to analyze
- Include the agent's instructions from `.claude/agents/`
- Request findings in the agent's output format

Run agents in parallel where possible.

### 5. Compile Final Report

```markdown
## Review Summary

### Overview

(One paragraph: what changed, overall quality, key concerns)

### Critical Issues (MUST FIX)

| #   | Agent | Location | Issue | Fix |
| --- | ----- | -------- | ----- | --- |
| 1   | ...   | ...      | ...   | ... |

### Warnings (SHOULD FIX)

| #   | Agent | Location | Issue | Fix |
| --- | ----- | -------- | ----- | --- |
| 1   | ...   | ...      | ...   | ... |

### Suggestions (NICE TO HAVE)

| #   | Agent | Location | Issue | Suggestion |
| --- | ----- | -------- | ----- | ---------- |
| 1   | ...   | ...      | ...   | ...        |

### Positive Highlights

- (Good patterns, clever solutions, well-tested code)

### Agent Scores

| Agent         | Score                               | Notes |
| ------------- | ----------------------------------- | ----- |
| Security      | SECURE/NEEDS ATTENTION              | ...   |
| Code Quality  | EXCELLENT/GOOD/NEEDS WORK           | ...   |
| Frontend      | (if applicable)                     | ...   |
| Backend       | (if applicable)                     | ...   |
| Desktop       | (if applicable)                     | ...   |
| Performance   | OPTIMIZED/ACCEPTABLE/SLOW           | ...   |
| UX            | POLISHED/GOOD/NEEDS WORK            | ...   |
| Architecture  | SOLID/HEALTHY/CONCERNING            | ...   |
| Testing       | COMPREHENSIVE/ADEQUATE/INSUFFICIENT | ...   |
| Build         | SUCCESS/PARTIAL/ISSUES              | ...   |
| Collaboration | WORKING/SYNC ISSUES                 | ...   |
| I18n          | LOCALIZED/NEEDS WORK                | ...   |
| DevOps        | READY/NEEDS CONFIG                  | ...   |

### Verdict

**READY TO MERGE** / **NEEDS FIXES** (list blockers) / **NEEDS REWORK** (major concerns)

### Suggested Actions

1. (First action to take)
2. (Second action)
   ...
```

## Quick Review Mode

For small changes (< 50 lines), use abbreviated review:

- Only invoke Code Reviewer + most relevant 1-2 agents
- Skip detailed scoring
- Provide quick summary with any blockers

## Follow-up Actions

After review:

- If fixes needed, offer to implement them
- If tests missing, offer to write them
- If docs needed, note what to document
