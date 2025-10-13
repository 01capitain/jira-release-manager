# Shared DTOs and API Typing

Goal: Keep a strict, reusable API contract across REST handlers and clients without exposing server-only types.

- Define DTO types in `src/shared/types/*`. These are safe to import on both server and client and represent the public contract.
- REST controllers must map database results to DTOs (via `select` and object mapping) before returning a response. Do not return Prisma entities directly.
- Validate transport payloads with shared Zod schemas (`src/shared/schemas/*`) so both server and client enforce the same rules.
- JSON fields (e.g., `tokenValues`) should be typed with a shared DTO and cast only at Prisma boundaries using `Prisma.InputJsonValue`.
- When you need pagination, reuse the helpers in `src/shared/types/pagination.ts` plus the REST helpers in `src/server/rest/pagination.ts` to keep `{ data, pagination }` responses consistent.

Example (server):

```ts
// src/server/rest/controllers/release-versions.controller.ts
import { ReleaseVersionDtoSchema } from "~/server/zod/dto/release-version.dto";

export const listReleaseVersions = async (context, query) => {
  const svc = new ReleaseVersionService(context.db);
  const result = await svc.list(query);
  return ReleaseVersionListResponseSchema.parse(result);
};
```

Example (client):

```ts
// src/app/versions/releases/api.ts
import { getJson } from "~/lib/rest-client";
import type { ReleaseVersionDto } from "~/shared/types/release-version";

export const fetchReleaseVersions = async (params) => {
  const search = new URLSearchParams({ page: "1", pageSize: "9" });
  return getJson<PaginatedResponse<ReleaseVersionDto>>(
    `/api/v1/release-versions?${search.toString()}`,
  );
};
```

Linting expectations:

- Avoid `any`/`unknown` at the API surface. Use DTOs and `Prisma.InputJsonValue` casts for JSON fields.
- Test files may use local `/* eslint-disable ... */` when mocking dynamic shapes.
