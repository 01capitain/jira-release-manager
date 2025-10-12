# Entity Management Policies

This guide explains how to add a new domain entity so that server and client stay in sync across transport layers (tRPC today, potential REST later), while keeping a single place of truth for validation and exposed fields.

## Goals

- Single source of truth for data shape
- Explicit control over fields exposed to clients
- Reusable business logic independent of transport (tRPC/REST)
- Predictable timestamp format across the app

## Steps to add a new entity

1. Define Prisma model (source of truth)

- Add the model to `prisma/schema.prisma` following our conventions in `docs/guides/database_design/entity_conventions.md`.
- Run `pnpm prisma generate` to regenerate Zod schemas (see generator config in `schema.prisma`).
  - Generated files live under `src/server/zod` (server-only). Do not edit them by hand.

2. Shared DTO and exposed fields

- Create a DTO type under `src/shared/types/<entity>.ts` – this is the public shape used by the client.
- Create a DTO schema/helper under `src/shared/zod/dto/<entity>.dto.ts` that:
  - Picks/derives fields from the generated Prisma model schema.
  - Converts database-native values (e.g., `Date`) to public types (e.g., `ISO8601`).
  - Validates the final DTO (schema `.parse`) before returning to clients.

3. Input validation (shared)

- Define shared input schemas under `src/shared/schemas/<entity>.ts` for create/update operations.
- Reuse these in both the server routers (tRPC/REST) and any client-side forms.

4. Business logic service

- Implement a service class under `src/server/services/<entity>.service.ts`.
- Inject `db` (PrismaClient) in the constructor and keep methods transport-agnostic.
- Have your routers/controllers call the service. This lets us reuse exactly the same behavior if/when we add REST.

5. Transport (tRPC and/or REST)

- tRPC router: import the service and shared input schemas. Convert results to DTOs using the DTO helpers before returning.
- REST route (if present): same pattern – call the service, return DTOs.

## Timestamps

- Always expose timestamps as `ISO8601` (UTC with `Z`). Use the shared type and schema:
  - Type: `src/shared/types/iso8601.ts` (`ISO8601` branded type)
  - Zod schema: `IsoTimestampSchema` (validates strict `YYYY-MM-DDTHH:mm:ss(.sss)?Z`)
- Convert database `Date` to `ISO8601` via `toISOString()` in DTO helpers, not inline in routers.

## Pagination, caching, and refresh policy

- Pagination: use the shared `PaginatedRequest<TSort>` / `NormalizedPaginatedRequest<TSort>` types from `src/shared/types/pagination.ts`. Parse inbound params with `createPaginatedRequestSchema(sortFields, { defaultSortBy, maxPageSize })` so every endpoint enforces defaults (`page = 1`, `pageSize = 9` unless overridden), accepts the `pagesize` alias, and clamps the requested limit.
- Responses: wrap list payloads in `PaginatedResponse<T>` via `buildPaginatedResponse` (or the equivalent helper) so all endpoints return the same `pagination` block (`page`, `pageSize`, `totalItems`, `hasNextPage`).
- Caching: use React Query with `staleTime: Infinity` so previously fetched pages are reused when navigating away and back.
- Refresh behavior: the Refresh action always navigates to page 1 and refetches page 1 only. It does not refetch other pages.

## Create behavior (list views)

- After a successful create, insert the new item at the top of cached page 1 and increment the cached `total`. Do not auto-refetch.
- Keep page-1 insertion logic in the page component (UI concern) and keep server-side logic in the service (business concern).

## Example (ReleaseVersion)

- Prisma model: `ReleaseVersion` in `prisma/schema.prisma`
- DTO type: `src/shared/types/release-version.ts`
- DTO helper (server-only): `src/server/zod/dto/release-version.dto.ts`
- Input schema: `src/shared/schemas/release-version.ts`
- Service: `src/server/services/release-version.service.ts`
- Router: `src/server/api/routers/release-version.ts`

This structure ensures we change fields in one place (Prisma) and consistently propagate to server and client with explicit public DTOs.
