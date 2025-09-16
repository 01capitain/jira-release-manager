# Documentation Index

A quick map of this repository’s docs and guides. Each entry links to a source file with more detail.

## Top Level

- [Project Overview](Project%20Overview.md) — high‑level goals and context for the app.
- [tools/](tools/) — assorted development utilities and references used in this project.

## Guides

- [guides/Add an environment variable](guides/Add%20an%20environment%20variable.md) — how to add and validate env vars with `src/env.js` and Zod.

### Business Logic

- [guides/business_logic/entity_management_policies](guides/business_logic/entity_management_policies.md) — how to add new domain entities and keep server/client in sync.
- [guides/business_logic/service_conventions](guides/business_logic/service_conventions.md) — service design patterns (semantic IDs, SRP, transitions API).
- [guides/business_logic/built_version](guides/business_logic/built_version.md) — Built Version creation side effects, status lifecycle (history), and client caching.
- [guides/business_logic/error_handling_policy](guides/business_logic/error_handling_policy.md) — current error handling approach and known limitations.

### Database Design

- [guides/database_design/entity_conventions](guides/database_design/entity_conventions.md) — schema conventions (required columns, discouraged booleans, schemas).
- [guides/database_design/user_model_changes](guides/database_design/user_model_changes.md) — safe ways to evolve the `User` model with NextAuth.
- [guides/database_design/prisma_zod_codegen](guides/database_design/prisma_zod_codegen.md) — how Prisma → Zod codegen is structured and used.

### User Interface

- [guides/user interface/ui_structure](guides/user%20interface/ui_structure.md) — app shell, navigation, breadcrumbs, and client vs server component placement.

## Related Files

- Prisma schema: [`prisma/schema.prisma`](../prisma/schema.prisma)
- Shared types and request schemas: [`src/shared`](../src/shared)
- Server Zod codegen output: [`src/server/zod`](../src/server/zod)

If you add new docs, please link them here with a one‑line description for quick discovery.
