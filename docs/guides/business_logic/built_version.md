# Built Version: Behavior & Side Effects

This document explains the behavior of `BuiltVersion` creation and lifecycle derivation.

## Creation Side Effects

When a Built Version is created (`BuiltVersionService.create`):

- The service expands naming patterns for all `ReleaseComponent` rows using tokens:
  - `{release_version}`, `{built_version}`, `{increment}`
- For each component, it creates a `ComponentVersion` row with an increment scoped to `(builtVersionId + componentId)`.
- This happens in a single transaction with the Built Version creation.

Implications:
- Creating a Built Version will always produce corresponding Component Version labels for all configured components.
- If a component has an invalid/empty pattern, the service skips it (defensive handling), leaving other components unaffected.

## Lifecycle & Status Derivation (History-Driven)

- There is no `status` column on `BuiltVersion`.
- Current status is computed from the latest `BuiltVersionTransition` entry.
  - No history → `in_development`.
  - All transitions (forward/backward) are append-only and validated by `BuiltVersionStatusService`.
- Transitions are reversible via explicit actions (`cancelDeployment`, `revertToDeployment`, `reactivate`).

Key files:
- History model: `prisma/schema.prisma` → `BuiltVersionTransition` + enums
- Service: `src/server/services/built-version-status.service.ts`
- API: `src/server/api/routers/built-version.ts` (`getStatus`, `transition`)

## Allowed Transitions

From `in_development`:
- `startDeployment` → `in_deployment`

From `in_deployment`:
- `markActive` → `active`
- `cancelDeployment` → `in_development`

From `active`:
- `deprecate` → `deprecated`
- `revertToDeployment` → `in_deployment`

From `deprecated`:
- `reactivate` → `active`
## Client Caching (Built Versions Page)

- The page `src/app/versions/builds/page.tsx` caches the releases-with-builds response in `localStorage` under the key `jrm:builds:releases-with-builds:v1`.
- Cache is used as placeholder data between navigations and refreshed on demand.
- Bump the key suffix (e.g., `v2`) when the response shape changes to avoid stale rendering.

