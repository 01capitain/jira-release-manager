# Database Entity Conventions

To ensure consistency and maintainability across our database schema, all entities must adhere to the following conventions.

## Required Columns

Every entity must include the following columns:

enum Status { ACTIVE INACTIVE ARCHIVED }
model User {
  id          String   @id @db.Uuid @default(dbgenerated("uuid_generate_v7()")) // or: gen_random_uuid() / uuid_generate_v4()
  created_at  DateTime @default(dbgenerated("CURRENT_TIMESTAMP"))
  updated_at  DateTime @default(dbgenerated("CURRENT_TIMESTAMP")) @db.Timestamp(6)
  status      Status   @default(ACTIVE)
  deleted_at  DateTime?
}
## Discouraged Data Types

### Booleans

Boolean fields (e.g., `isActive`, `isDeleted`) should be avoided. Instead of a boolean, consider using a timestamp or a status enum that can represent more states than just true/false. For example:

*   Instead of `is_deleted`, use a `deleted_at` timestamp. The presence of a timestamp indicates deletion.
*   Instead of `is_active`, use a `status` field that can hold values like `active`, `inactive`, `archived`, etc.

This approach provides more context and flexibility for future requirements.

```prisma
enum Status { ACTIVE INACTIVE ARCHIVED }
model User {
  id        String  @id @default(cuid())
  status    Status  @default(ACTIVE)
  deletedAt DateTime?
}
```
