# REST Entity Playbook

This guide distills everything we learned from the patch feature into a reusable playbook. Follow it whenever you expose a new domain entity via REST. The goal is that every entity has a single source of truth, consistent OpenAPI output, and well‑behaved tests.

---

## 1. Shared DTO Contract

| Step | File | Notes |
| --- | --- | --- |
| Define the DTO type | `src/shared/types/<entity>.ts` | Use existing DTOs (e.g., `patch.ts`) as a blueprint. Prefer `UuidV7` for identifiers and `ISO8601` for timestamps. |
| Add supporting enums/types | Same folder | Keep public, serialisable types alongside the DTO. Do not import Prisma types here. |

### UUID requirements

- Reuse `UuidV7` from `src/shared/types/uuid.ts`.
- Reuse the ID helper exported by the owning DTO for foreign keys. For example, prefer `UserSummaryDtoSchema.shape.id` (or its exported alias) rather than dropping back to `UuidV7Schema` directly. That way, every reference stays in sync with the parent contract if metadata changes.

---

## 2. Zod DTO Schema

| Step | File | Notes |
| --- | --- | --- |
| Create a Zod DTO | `src/server/zod/dto/<entity>.dto.ts` | Start from the Prisma pure schema (`…/variants/pure/<Entity>.pure.ts`). Pick only the fields you expose and transform server-only values (e.g., `Date → IsoTimestampSchema`). |
| Export an ID helper | `export const <Entity>IdSchema = <Entity>DtoSchema.shape.id;` | Other schemas and controllers should consume this instead of re-declaring `UuidV7Schema`. |
| Export mapping helpers | `to<Entity>Dto`, `mapTo<Entity>Dtos` | Ensure the function strips unknown Prisma fields and re-validates via the DTO schema. |
| Attach metadata | `.meta({ id, title, description })` | Guarantees the OpenAPI generator emits component references instead of expanding objects inline. |
| Source model schema | `src/server/zod/schemas/variants/pure/<Entity>.pure.ts` | Generated automatically by `prisma-zod-generator`. Run `pnpm prisma generate` any time you change `prisma/schema.prisma`; the playbook assumes these generated schemas exist. |

When the entity has nested relations, compose them the same way Release Versions do:

```ts
const ThingWithRelationsSchema = ThingDtoSchema.extend({
  owner: UserSummaryDtoSchema.optional(),
  subItems: z.array(SubItemDtoSchema).optional(),
}).meta({ … });
```

---

## 3. Service Layer

| Step | File | Notes |
| --- | --- | --- |
| Return domain data | `src/server/services/<entity>.service.ts` | Return plain domain objects (Prisma selects with `Date` values). Do **not** call DTO parsers here; controllers own transport parsing. Never leak raw Prisma clients from controllers. |
| Normalise relations | `src/server/services/<entity>.relations.ts` | Keep relation allow-lists small and explicit. Cross-check with REST controllers. |
| Emit audit logs | `src/server/services/<entity>.service.ts` | If a write touches domain state, use `ActionHistoryService` just as `PatchService` does. |

Make sure any hard-coded IDs in tests use UUIDv7-formatted strings; the DTO schemas now enforce it.

---

## 4. REST Controller

Files live under `src/server/rest/controllers`. For a new entity, provide the following exports:

1. **Request schemas**
   - Use `createPaginatedRequestSchema` (and the companion `createPaginatedQueryDocSchema`) for list endpoints.
   - Path params should import the ID helper exported from the DTO module.
2. **Response schemas**
   - Use `createPaginatedResponseSchema(<Entity>WithRelationsSchema)` for list endpoints.
   - For detail endpoints export `<Entity>DetailSchema` so other controllers/tests can reference it.
3. **Path definition**
   - Add an entry to `<entity>Paths` with `operationId`, `summary`, `tags`, `requestParams`, and `responses`.
4. **Handlers**
   - `list<Entity>`: validate auth, call the service, return DTOs.
   - `get<Entity>`: same pattern, honour requested relations.
   - When applicable, implement create/update endpoints that return the DTO schema.

Controllers own the transport boundary: validate/normalise inputs, call services, and parse service outputs into DTO schemas before returning. Services should not perform `…DtoSchema.parse`—they should return raw domain objects that controllers convert with DTO helpers.

Always consume the exported ID schemas (`<Entity>IdSchema`, `<Entity>IdParamSchema`, etc.) to keep OpenAPI consistent.

---

## 5. OpenAPI Generation

The generator (`scripts/generate-openapi.ts`) automatically picks up new controllers when you spread their `<entity>Paths` into `paths`. To expose a new entity:

1. Export `<entity>Paths` from the controller.
2. Import and spread it inside `paths` in `generate-openapi.ts`.
3. Run `pnpm openapi:generate` to refresh `docs/api/openapi.yaml`.

If your schema metadata is present, the generator will collapse arrays of entities into `$ref` components automatically.

---

## 6. Testing

| Step | File | Notes |
| --- | --- | --- |
| Service unit tests | `tests/services/<entity>.service.test.ts` | Continue to use mocked Prisma clients. When seeding fake data, ensure IDs match UUIDv7 format and timestamps are `Date` objects. |
| REST e2e tests | `tests/e2e/<entity>.rest.e2e.test.ts` | Mirror the release and patch tests. Use request helpers (`NextRequest`) and parse the JSON with the exported response schemas to assert contracts. |
| Regression tests | `tests/e2e/<entity>.rest.e2e.test.ts` | Extend pagination and relation tests to cover new allow-lists. |

For quick setup, copy the structure from the patch specs and replace the entity-specific fields.

---

## 7. Verification Checklist

Use this checklist before raising a PR:

- [ ] `src/shared/types/<entity>.ts` defines the DTO with `UuidV7` and `ISO8601`.
- [ ] `src/server/zod/dto/<entity>.dto.ts` exports the DTO schema, ID schema, and mapping helpers with metadata.
- [ ] Services return DTOs only and audit writes.
- [ ] REST controller(s) expose list/detail schemas, reuse ID helpers, and plug the `<entity>Paths` into the OpenAPI generator.
- [ ] New relation allow-lists (if any) live in `src/server/services/<entity>.relations.ts` and are consumed in controllers/services.
- [ ] Tests cover services and REST endpoints with valid UUIDv7 fixtures.
- [ ] `pnpm typecheck`, `pnpm test`, and `pnpm openapi:generate` succeed.

Keep this playbook updated as you add supporting utilities (for example, shared pagination helpers or new audit log conventions). The easier it is to follow, the harder it is to accidentally drift from our API contract.
