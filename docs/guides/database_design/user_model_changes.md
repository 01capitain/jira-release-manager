# User Model: Safe Changes

This guide explains how to add or change attributes on the `User` model while keeping NextAuth.js authentication working and the database consistent.

## What is reserved for authentication

The following aspects must not be removed or fundamentally changed, as they are required by the NextAuth Prisma Adapter and existing relations:

- Primary key: `id: String @id @db.Uuid` — keep the type and identity. Do not rename or change the type.
- Relations: `accounts: Account[]` and `sessions: Session[]` — keep both relations intact.
- Foreign keys in auth models reference `User.id` and must remain valid.

Notes on optional attributes used by some providers:

- `email` and `emailVerified` are used by the Email provider and by some application flows. If you use the Email provider, keep `email` unique and keep `emailVerified: DateTime?`.
- If you do not use the Email provider, these fields may remain optional; do not remove them without auditing the code paths that read them.

## Auth tables are prefixed

To make accidental edits less likely and clarify ownership, the authentication‑related tables are set within a separate postgres schema `auth` via @@schema('auth') in the Model definition.

`User` remains part of the default @@schema('app')

## Things to avoid

- Do not rename `id` or change its type.
- Do not remove the `accounts` or `sessions` relations.
- Do not change the `@@map` names of auth tables unless you also handle data migrations and adapter expectations.
- Avoid booleans for lifecycle state; prefer `status` enums and timestamps as per conventions.
