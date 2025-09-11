# Database Entity Conventions

To ensure consistency and maintainability across our database schema, all entities must adhere to the following conventions.

Keep default Prisma model names for NextAuth: User, Account, Session, VerificationToken.

## Required Columns

Every entity must include the following columns:

- id String @id @db.Uuid @default(dbgenerated("uuid_generate_v7()"))
- created_at DateTime @default(dbgenerated("CURRENT_TIMESTAMP"))
- updated_at DateTime @default(dbgenerated("CURRENT_TIMESTAMP")) @db.Timestamp(6)

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
