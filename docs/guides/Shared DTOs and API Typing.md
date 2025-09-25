# Shared DTOs and API Typing

Goal: Keep a strict, reusable API contract across tRPC (and future REST) without exposing server-only types to the client.

- Define DTO types in `src/shared/types/*`. These are safe to import on both server and client and represent the public contract.
- tRPC procedures should map database results to DTOs (via `select` and object mapping) and return those DTOs. Do not return Prisma entities directly.
- Derive client types from the router using `RouterOutputs`/`RouterInputs` and reference DTOs indirectly (e.g., `type LatestPost = RouterOutputs['post']['getLatest']`).
- JSON fields (e.g., `tokenValues`) should be typed with a shared DTO (e.g., `TokenValues`) and cast only at Prisma boundaries using `Prisma.InputJsonValue`.

Example (server):

```ts
// src/server/api/routers/post.ts
import type { PostDto } from "~/shared/types/post";

getLatest: protectedProcedure.query(async ({ ctx }): Promise<PostDto | null> => {
  const post = await ctx.db.post.findFirst({
    orderBy: { createdAt: "desc" },
    where: { createdBy: { id: ctx.session.user.id } },
    select: { id: true, name: true, createdAt: true, createdById: true },
  });
  return post ? { ...post } : null;
}),
```

Example (client):

```ts
// src/app/_components/post.tsx
import type { RouterOutputs } from "~/trpc/react";
type LatestPost = RouterOutputs['post']['getLatest'];
const [latestPost]: [LatestPost] = api.post.getLatest.useSuspenseQuery();
```

Linting expectations:

- Avoid `any`/`unknown` at the API surface. Use DTOs and `Prisma.InputJsonValue` casts for JSON fields.
- Test files may use local `/* eslint-disable ... */` when mocking dynamic shapes.

