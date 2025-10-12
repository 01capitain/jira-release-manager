# GET Endpoint Implementation Guide

Use this playbook when exposing entity detail endpoints so the behavior matches the release version GET route implemented in this branch.

## Shared Contracts

- Return DTOs that extend your base type with any related aggregates. Example: `src/shared/types/release-version-with-builds.ts` merges `ReleaseVersionDto` with a `builtVersions: BuiltVersionDto[]` array.
- Centralize shared lookup helpers (e.g., `mapToBuiltVersionDtos`) so all transports reuse the same shape.
- Validate path parameters with Zod schemas placed alongside the controller (`ReleaseVersionIdParamSchema` in `src/server/rest/controllers/release-versions.controller.ts` uses `z.uuidv7`).
- Document the response in `docs/api/openapi.yaml`, including nested collections and required fields. Provide explicit `404` error mappings (`RestError`) for missing entities.

## Server Implementation

- **Service layer** (`src/server/services`):
  - Accept semantic IDs (`ReleaseVersion["id"]`) and query only the fields required by the DTO.
  - Sort nested relations deterministically (`orderBy: { createdAt: "desc" }` for built versions) before mapping to DTOs.
  - Throw `RestError` with a precise code (`NOT_FOUND`) when no entity exists; callers should not have to duplicate null checks.
  - Wrap related entities via mapper utilities (e.g., `mapToBuiltVersionDtos`) to keep service logic concise.
- **REST controller** (`src/server/rest/controllers`):
  - Guard access with `ensureAuthenticated(context)` (release versions require auth for reads).
  - Parse and validate params using the shared schema, then delegate straight to the service.
  - Register the path in `releaseVersionPaths` so OpenAPI stays current.
  - Use `jsonResponse(data)` to return the DTO as-is; avoid ad-hoc response shapes.
- **Route handler** (`src/app/api/v1/<entity>/[id]/route.ts`):
  - Compose `createRestHandler` with `ReleaseVersionIdParamSchema.parse(params)` to fail fast on invalid IDs.
  - Exchange the controller result for a simple JSON response, letting `RestError` propagate for consistent HTTP codes.
- **tRPC router** (if exposed):
  - Wrap the service call in `protectedProcedure` or `publicProcedure` depending on auth requirements.
  - Reuse the same DTO and `RestError` handling; return service results directly so REST and tRPC stay aligned.

## Client Usage

- Use shared DTO types to type client accessors. For example, a React page can import `ReleaseVersionWithBuildsDto` to type route loader data.
- Fetch data via `getJson` from `src/lib/rest-client.ts`, which surfaces `RestApiError` with status/code for error UI.
- Handle `404` by showing an entity-not-found state informed by the `RestApiError.code`.
- If you prefetch details via React Query, key the cache by entity ID and invalidate it whenever mutations update the entity.

## Testing Expectations

- Add service tests covering:
  - Happy path mapping of nested relations (`builtVersions` ordering).
  - Failure path emitting `RestError` with `NOT_FOUND`.
- Extend REST e2e tests (`tests/e2e/<entity>.rest.e2e.test.ts`) with:
  - 200 response assertions verifying DTO fields and nested arrays.
  - 404 response when the entity does not exist.
- If tRPC exposes the detail, add integration tests to confirm it mirrors REST status codes and payloads.

## Implementation Checklist

1. Define/extend the shared DTO for the detailed entity shape.
2. Implement the service `getById` (or equivalent) returning that DTO and throwing `RestError` on missing records.
3. Wire REST (and optionally tRPC) handlers that reuse shared param schemas, enforce auth, and delegate to the service.
4. Update `docs/api/openapi.yaml` to document the path, response schema, and error shapes.
5. Add client fetch helpers and not-found handling rooted in the shared DTO and `RestApiError`.
6. Cover the endpoint with service and REST tests, including error scenarios.
