# List Endpoint Implementation Guide

This guide captures the end-to-end pattern for adding new list endpoints so future work stays aligned with the release version list implementation that landed in this branch.

## Shared Contracts

- Define your DTO in `src/shared/types/<entity>.ts` and reuse it everywhere (see `src/shared/types/release-version.ts`).
- Import pagination helpers from `src/shared/types/pagination.ts` to standardize request/response shapes (`PaginatedRequest`, `NormalizedPaginatedRequest`, `PaginatedResponse`).
- Build an input schema with `createPaginatedRequestSchema` and export sort constants plus defaults from `src/server/api/schemas/<entity>.ts`. Follow the release version example:
  - `RELEASE_VERSION_SORT_FIELDS` enumerates allowed sort keys.
  - `DEFAULT_RELEASE_VERSION_LIST_INPUT` holds the normalized defaults that both REST and tRPC use.
- When exposing the list endpoint via REST, extend `docs/api/openapi.yaml` so the `/api/v1` contract shows the `data` + `pagination` response shape via `pnpm openapi:generate`.

## Server Implementation

- **Service layer** (`src/server/services`):
  - Accept a `NormalizedPaginatedRequest<TSort>` so every call receives validated pagination+sort parameters.
  - Resolve Prisma `orderBy` from the normalized `sortBy`, call `count` and `findMany`, then feed the results into `buildPaginatedResponse` from `src/server/rest/pagination.ts`. This guarantees a consistent `{ data, pagination }` payload.
- **tRPC router** (`src/server/api/routers`):
  - Wrap the shared schema with `protectedProcedure.input(...).query(...)`.
  - Fall back to the exported `DEFAULT_*` input when no overrides are supplied, and pass the normalized payload directly to the service method. The router should return the service’s `PaginatedResponse` unchanged so clients share one contract.
- **REST controller** (`src/server/rest/controllers`):
  - Parse query params with the same `createPaginatedRequestSchema`.
  - Return the service result verbatim. Use `createPaginatedResponseSchema` to describe the JSON shape for OpenAPI registration.
  - Register the handler in `src/app/api/v1/<entity>/route.ts` using `createRestHandler` and `parseSearchParams` (see the release versions route for a template).

## Client Usage

- tRPC consumers (e.g., React pages) should type their hooks via `RouterOutputs['<namespace>']['<procedure>']` and rely on the `PaginatedResponse` shape (`response.data` + `response.pagination`). Example: `src/app/jira-settings/releases/page.tsx` keeps the list response in `releaseItems`.
- REST consumers should call `getJson`/`requestJson` helpers from `src/lib/rest-client.ts`. Those helpers already attach JSON headers and translate API errors into the shared `RestApiError` class so components can surface friendly messages.
- When composing new React Query hooks (see `src/app/versions/releases/api.ts`), export thin wrappers that delegate to the REST helper. Keep all typing in the shared DTO to avoid duplicating contracts.

## Testing Expectations

- Add unit coverage in `tests/services/<entity>.service.pagination.test.ts` using `registerPaginationBehaviorTests` from `tests/shared/pagination.behavior.ts`. Supply the entity-specific sort fields, normalization helper, and an assertion callback that verifies sorting.
- Cover REST behavior with e2e-style tests under `tests/e2e/<entity>.rest.e2e.test.ts`. Mirror the release versions suite: seed fake data, assert happy-path pagination, and exercise validation failures.
- Update existing integration tests that read the list endpoint so they assert on both `data` and `pagination`. This prevents regressions when pagination rules or defaults change.

## Implementation Checklist

1. Define/extend shared DTOs and export pagination defaults.
2. Implement the service `list` method returning `PaginatedResponse`.
3. Wire tRPC and REST handlers to the shared schema and service.
4. Update `docs/api/openapi.yaml` with the new path or adjusted schema.
5. Expose client helpers (REST and/or tRPC hooks) that reuse DTO types.
6. Add pagination behavior unit tests plus REST e2e coverage.
