# Prisma + Zod Codegen Layout

This project generates Zod schemas from the Prisma models to keep server and client types aligned while maintaining a strict DTO boundary.

## Where code is generated

- Prisma schema: `prisma/schema.prisma`
- Zod generator output: `src/server/zod`
  - Pure model schemas live under `src/server/zod/schemas/variants/pure/*.pure.ts`
  - DTO helpers live under `src/server/zod/dto/*.dto.ts` and map DB models → transport DTOs

## Why generate Zod from Prisma

- Single source of truth for entity fields and relations
- Server-side validation and parsing against the actual schema
- Stable DTO shapes exposed to clients (no accidental leakage of private fields)

## Typical flow

1) Update Prisma models in `prisma/schema.prisma` following DB conventions.
2) Run migrations in development:
   - `pnpm db:generate` (migrate dev)
   - Ask a developer to run: `pnpm prisma generate` (client + zod) – see note below
3) Implement DTO mappers in `src/server/zod/dto/*.dto.ts` to:
   - Pick only allowed fields
   - Convert `Date` → ISO-8601 strings
   - Validate DTOs before returning from services/routers

Note: In this environment we don’t auto-run `pnpm prisma generate`. Ask the developer to run it when schema changes.

## Client import rule

- Clients should never import server-only pure schemas. Import DTO types from `src/shared/types/*` and request/response schemas from `src/shared/schemas/*` when needed.

## Example

- Built Version DTO mapping at `src/server/zod/dto/built-version.dto.ts`:
  - Picks `{ id, name, versionId, createdAt }` from the model
  - Converts `createdAt` to ISO string
  - Validates DTO via `BuiltVersionDtoSchema`

