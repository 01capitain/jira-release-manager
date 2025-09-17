# Built Version: Behavior & Side Effects

This document explains how Built Versions are created, named, and how their lifecycle and UI updates are derived.

## Automatic Creation & Naming

- On Release creation: An initial Built Version is automatically created with name pattern `{release_version}.{increment}` using increment `0` (e.g., `version 178.0`).
- On transition to deployment: When a Built Version transitions from `in_development` to `in_deployment`, a successor Built Version is automatically created for the same Release with the next increment (e.g., `version 178.1`).
- Successor guard: A successor is only created if no newer Built Version already exists for that Release. If a newer build exists, no additional build (e.g., `.3`) is created.
- Release-scoped increment: The increment for Built Version names is tracked on `ReleaseVersion.lastUsedIncrement` and increases per Release (starts at `-1`, first auto build is `0`).

## Token Snapshots

To make name generation reproducible and auditable:
- `BuiltVersion.tokenValues` stores `{ "release_version": string, "increment": number }`.
- `ComponentVersion.tokenValues` stores `{ "release_version": string, "built_version": string, "increment": number }`.

## Component Versions on Build Creation

Whenever a Built Version is created (initial or successor):
- The service expands naming patterns for all `ReleaseComponent`s using tokens `{release_version}`, `{built_version}`, `{increment}`.
- For each component, a `ComponentVersion` row is created with `increment` scoped per `(builtVersionId + componentId)`, starting at `0`.
- Invalid/empty patterns are skipped defensively without affecting other components.

## Lifecycle & Status Derivation (History-Driven)

- There is no `status` column on `BuiltVersion`.
- Current status is computed from the latest `BuiltVersionTransition` entry.
  - No history → `in_development`.
  - Transitions are append-only and validated by `BuiltVersionStatusService`.
- Reversible actions: `cancelDeployment`, `revertToDeployment`, `reactivate`.

### Allowed Transitions

From `in_development`:
- `startDeployment` → `in_deployment` (triggers successor creation if no newer build exists)

From `in_deployment`:
- `markActive` → `active`
- `cancelDeployment` → `in_development`

From `active`:
- `deprecate` → `deprecated`
- `revertToDeployment` → `in_deployment`

From `deprecated`:
- `reactivate` → `active`

## UI Behavior

- Builds page (`src/app/versions/builds/page.tsx`) invalidates and refetches the releases-with-builds list only after a successful `startDeployment` transition, ensuring the auto-created successor appears immediately. Other transitions do not trigger a list reload.
- The page caches the releases-with-builds response in `localStorage` under `jrm:builds:releases-with-builds:v1` as placeholder data and refreshes on demand.

## Key Files

- Prisma models: `prisma/schema.prisma` (`ReleaseVersion.lastUsedIncrement`, `BuiltVersion.tokenValues`, `ComponentVersion.tokenValues`, `BuiltVersionTransition` + enums)
- Services: `src/server/services/release-version.service.ts`, `src/server/services/built-version-status.service.ts`
- API: `src/server/api/routers/built-version.ts` (`getStatus`, `transition`)
