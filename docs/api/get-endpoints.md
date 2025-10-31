# GET Endpoint Implementation Guide

Use this playbook when exposing entity detail endpoints so the behavior matches the release version GET route implemented in this branch.

## Shared Contracts

- Return DTOs that extend your base type with any related aggregates. Example: `src/shared/types/release-version-with-builds.ts` merges `ReleaseVersionDto` with a `builtVersions: BuiltVersionDto[]` array.
- Centralise shared lookup helpers (e.g., `mapToBuiltVersionDtos`) so all transports reuse the same shape.
- Validate path parameters with Zod schemas placed alongside the controller (`ReleaseVersionIdParamSchema` in `src/server/rest/controllers/release-versions.controller.ts` uses `z.uuidv7`).
- Document the `relations` allowlist in OpenAPI and note that nested keys (e.g., `builtVersions.deployedComponents`) must be accompanied by their parent. Provide explicit `404` error mappings (`RestError`) for missing entities.

## Server Implementation

- **Service layer** (`src/server/services`):
  - Accept semantic IDs (`ReleaseVersion["id"]`) and query only the fields required by the DTO.
  - Use the relation registry to compose Prisma `include/select` clauses and keep nested sorting deterministic (`orderBy: { createdAt: "desc" }`).
  - Throw `RestError` with a precise code (`NOT_FOUND`) when no entity exists; callers should not have to duplicate null checks.
  - Wrap related entities via mapper utilities (`toUserSummaryDto`, `mapToComponentVersionDtos`, etc.) so the registry stays single-sourced.
- **REST controller** (`src/server/rest/controllers`):
  - Guard access with `ensureAuthenticated(context)` (release versions require auth for reads).
  - Parse `relations` via `parseReleaseVersionRelations`, rejecting unknown keys or missing parents with `RestError(400, "INVALID_RELATION", ...)`.
  - Parse and validate the remaining params using the shared schema, then delegate straight to the service.
  - Register the path in `releaseVersionPaths` so OpenAPI stays current.
  - Use `jsonResponse(data)` to return the DTO as-is; avoid ad-hoc response shapes.
- **Route handler** (`src/app/api/v1/<entity>/[id]/route.ts`):
  - Compose `createRestHandler` with `ReleaseVersionIdParamSchema.parse(params)` to fail fast on invalid IDs.
  - Call the controller with the normalized query + validated relations, letting `RestError` propagate for consistent HTTP codes.

## Client Usage

- Use shared DTO types to type client accessors. When relations are required, import `ReleaseVersionWithRelationsDto` and request the matching relation keys explicitly.
- Fetch data via `getJson` from `src/lib/rest-client.ts`, which surfaces `RestApiError` with status/code for error UI.
- Handle `404` by showing an entity-not-found state informed by the `RestApiError.code`.
- If you prefetch details via React Query, key the cache by entity ID and invalidate it whenever mutations update the entity.

## Testing Expectations

- Add service tests covering:
  - Relation opt-in (built versions, creator, nested components/transitions).
  - Parser failures (unknown relation, missing parent) alongside the existing `NOT_FOUND` path.
- Extend REST e2e tests (`tests/e2e/<entity>.rest.e2e.test.ts`) with:
  - 200 response assertions verifying DTO fields and nested arrays.
  - 404 response when the entity does not exist.

## Implementation Checklist

1. Extend the shared relation types/registry with any new relation keys.
2. Implement the service `getById`/`list` relation handling and throw `RestError` on invalid lookups.
3. Wire REST handlers to validate `relations`, enforce auth, and delegate to the service.
4. Update `docs/api/openapi.yaml` to document the query parameter allowlist, response schema, and error shapes.
5. Add client fetch helpers and not-found handling rooted in the shared DTO and `RestApiError`.
6. Cover the endpoint with service and REST tests, including invalid relation scenarios.
