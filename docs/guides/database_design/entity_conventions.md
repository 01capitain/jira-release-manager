# Database Entity Conventions

To ensure consistency and maintainability across our database schema, all entities must adhere to the following conventions.

Keep default Prisma model names for NextAuth: User, Account, Session, VerificationToken.

## Required Columns

Every entity must include the following columns:

- id String @id @db.Uuid @default(dbgenerated("uuid_generate_v7()"))
- createdAt DateTime @default(now())
- updatedAt DateTime @updatedAt

### User Generated entities

If an entity is created by a user, store it with the following columns:

- createdBy User @relation(fields: [createdById], references: [id])
- createdById String @db.Uuid

### Deletable entities

If an entity can be deleted via the app, always soft delete them and store the information as follows:

- deletedBy User @relation(fields: [deletedById], references: [id])
- deletedById String @db.Uuid
- deleted_at DateTime?

## Discouraged Data Types

### Booleans

Boolean fields (e.g., `isActive`, `isDeleted`) should be avoided. Instead of a boolean, consider using a timestamp or a status enum that can represent more states than just true/false. For example:

- Instead of `is_deleted`, use a `deleted_at` timestamp. The presence of a timestamp indicates deletion.
- Instead of `is_active`, use a `status` field that can hold values like `active`, `inactive`, `archived`, etc.

This approach provides more context and flexibility for future requirements.

```prisma
enum Status { ACTIVE INACTIVE ARCHIVED }
model User {
  id        String  @id @default(cuid())
  status    Status  @default(ACTIVE)
  deletedAt DateTime?
}
```

## Specify schema

Always specify the schema of the entity. If the entity is handled within the application, use @@schema("app")

@@schema("auth") is exclusively used for entities managed by NextAuth adapter.

Also specify the schema when a new enum is defined.

## Timestamps: Public API Type

When exposing timestamps to clients (via tRPC/REST), use the shared `ISO8601` type:

- Type location: `src/shared/types/iso8601.ts`
- Format: strict UTC ISO 8601 ending with `Z` (e.g., `2025-01-01T12:34:56.000Z`)
- Validation schema: `IsoTimestampSchema` (Zod) – validates the `YYYY-MM-DDTHH:mm:ss(.sss)?Z` pattern

Implementation notes:

- In DTO helpers (e.g., `src/shared/zod/dto/*.dto.ts`), convert database `Date` to ISO via `.toISOString()` and validate the DTO before returning.
- Do not return raw `Date` objects to clients.
