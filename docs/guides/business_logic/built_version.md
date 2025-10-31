# Built Version: Behavior & Side Effects

This document explains how Releases (Built Versions) are created, named, and how their lifecycle and UI updates are derived.

## Automatic Creation & Naming

- On Release creation: An initial Built Version is automatically created with name pattern `{release_version}.{increment}` using increment `0` (e.g., `version 178.0`). Only **global** release components are seeded into this initial build.
- On transition to deployment: When a Built Version transitions from `in_development` to `in_deployment`, a successor Built Version is automatically created for the same Release with the next increment (e.g., `version 178.1`).
- Successor guard: A successor is only created if no newer Built Version already exists for that Release. If a newer build exists, no additional build (e.g., `.3`) is created.
- Release-scoped increment: The increment for Built Version names is tracked on `ReleaseVersion.lastUsedIncrement` and increases per Release (starts at `-1`, first auto build is `0`).

## Token Snapshots

To make name generation reproducible and auditable:
- `BuiltVersion.tokenValues` stores `{ "release_version": string, "increment": number }`.
- `ComponentVersion.tokenValues` stores `{ "release_version": string, "built_version": string, "increment": number }`.

## Release Component Scope

- Each Release Component must define a `releaseScope`: `version-bound` or `global`.
- **Global** components represent platform-wide dependencies. They are auto-seeded into every new built (including the initial build for a new release) and remain selected by default during successor arrangement, even when omitted in the UI.
- **Version-bound** components are release-specific. They are never auto-seeded; operators choose them explicitly per deployment cycle.
- Newly created components do not backfill historical Built Versions. Their scope rules start applying with the next deployment planning session.

## Successor Creation (createSuccessorBuilt)

When a Built Version transitions to `in_deployment`, operators select which components to include in that release.

Behavior:
- Successor creation: The successor Built Version (X+1) is auto-created on the status transition `startDeployment` (in_development → in_deployment) if no newer build exists yet.
- Selected components: remain attached to the releasing Built (X). Ensure exactly one successor row exists in (X+1) per component via an upsert using the naming helpers and token snapshots. Successor component series start at increment `0`.
- Unselected components: move the existing row from X to X+1 (no new entity). Recompute name and token snapshot using the successor’s name. If a non-materialized placeholder exists in X+1 for that component, remove it before the move to avoid duplicates; otherwise perform the move idempotently.
- Validation: at least one component must be selected; otherwise return a validation error.
- Transactional and idempotent: perform the entire operation in a single transaction; enforce uniqueness on `(builtVersionId, releaseComponentId)` in the successor to prevent duplicates.
Notes:
- The selection step (`createSuccessorBuilt`) keeps the build in `in_deployment`. Marking a build `active` is a separate transition performed afterwards.
- Naming uses `{release_version}`, `{built_version}`, `{increment}` with snapshots stored on both Built and Component rows.
- Allowed only when the current status is `in_deployment`.
- Retries of `createSuccessorBuilt` must be idempotent (no duplicate successor rows, no name regressions) and should handle existing placeholders gracefully.
- Terminology: a “placeholder” ComponentVersion is a pre-created, non-materialized row that can be safely replaced/removed during selection.

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

- Releases page (`src/app/versions/releases/page.tsx`) invalidates and refetches the releases-with-builds list only after a successful `startDeployment` transition, ensuring the auto-created successor appears immediately. Other transitions do not trigger a list reload.
- The page caches the releases-with-builds response in `localStorage` under `jrm:releases:accordion:releases-with-builds:v1` as placeholder data and refreshes on demand.
- Default selection (no prior active build): selects every global `ReleaseComponent`. When an active built exists, defaults mirror its component selection and automatically re-include the global set.

## Key Files

- Prisma models: `prisma/schema.prisma` (`ReleaseVersion.lastUsedIncrement`, `BuiltVersion.tokenValues`, `ComponentVersion.tokenValues`, `BuiltVersionTransition` + enums)
- Services: `src/server/services/release-version.service.ts`, `src/server/services/built-version-status.service.ts`, `src/server/services/deployment.service.ts`
- API: `src/server/api/routers/built-version.ts` (`getStatus`, per-action transitions, `createSuccessorBuilt` selection)
