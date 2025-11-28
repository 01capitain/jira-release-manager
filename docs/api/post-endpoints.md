# POST Endpoint Implementation Guide

Follow this playbook whenever you introduce a new create POST endpoint so it mirrors the release version flow added on this branch.

## Shared Contracts

- Define the input schema under `src/shared/schemas/<entity>.ts` using Zod. Trim and validate strings (`z.string().trim().min(1, { message: "…" })`) so both client and server enforce identical rules (see `src/shared/schemas/release-version.ts`).
- Export the corresponding DTO from `src/shared/types/<entity>.ts` to describe the success payload returned by services, controllers, and clients.
- If the endpoint needs reusable error codes, document them beside the schema or in shared `RestError` helpers so clients can map them consistently.
- After wiring the controller, run `pnpm openapi:generate` so `docs/api/openapi.yaml` captures the new POST path.

## Server Implementation

- **Service layer** (`src/server/services`):
  - Accept the authenticated `userId` (semantic ID type) plus the validated input.
  - Perform trimming or normalisation before persistence; avoid repeating these operations in controllers.
  - Use a single transaction to persist the entity and any cascading records. The release version service creates the release, seeds the initial patch, updates `lastUsedIncrement`, and pre-populates component versions.
  - Collect audit trail metadata during the transaction and flush subactions via the optional `{ logger?: ActionLogger }` once the transaction commits.
  - Return the DTO (`to<Entity>Dto`) so every caller shares the same shape.
- **REST controller** (`src/server/rest/controllers`):
  - Guard the route with `ensureAuthenticated(context)` to reuse session validation.
  - Reuse the shared schema via `parseJsonBody` for automatic error responses.
  - Start an `ActionHistoryService` action mirroring the service's audit trail expectations. Trim inputs again only if the schema cannot express the normalisation.
  - Throw `RestError` for domain validation issues (e.g., duplicate names) so clients receive structured error codes.
  - Register the handler in `src/app/api/v1/<entity>/route.ts` using `createRestHandler`, and respond with `jsonResponse(result, { status: 201 })`.

## Client Usage

- Validate form input on the client with the same shared schema (e.g., `ReleaseVersionCreateSchema.safeParse`) to provide immediate feedback before firing the request.
- Wrap the POST call with `postJson` from `src/lib/rest-client.ts`, which handles headers and converts non-2xx responses into `RestApiError`.
- Use React Query `useMutation` helpers (`src/app/versions/releases/api.ts`) to expose a typed mutation hook that returns the shared DTO and surfaces `RestApiError` instances for UI error states.
- After a successful mutation, invalidate any cached queries that depend on the created entity. For React Query, call `queryClient.invalidateQueries({ queryKey: ['release-versions', 'with-patches'] })` (adjust the key to your flow) to refresh views.

## Testing Expectations

- Add service-level unit tests in `tests/services/<entity>.service.test.ts` to verify transactional side effects (entity persistence, related record creation, audit logging).
- Extend the REST e2e suite (`tests/e2e/<entity>.rest.e2e.test.ts`) with cases for:
  - 201 success payload and side effects (e.g., seeded patches).
  - 401 for unauthenticated requests.
  - 400 validation errors when the shared schema rejects input.
  - 409 or other domain-specific conflicts where applicable.

## Implementation Checklist

1. Define shared input schema and DTO.
2. Implement the service `create` method with transactional side effects and optional audit logging.
3. Wire the REST endpoint, ensuring authentication and action history tracking.
4. Update `docs/api/openapi.yaml` with the new POST specification.
5. Add client helpers (React Query mutation, local validation, UI error handling).
6. Cover the new endpoint with unit and e2e tests, including failure scenarios.
