Auto-generated Zod Schemas (Server-only)

What is this?
- This folder contains Zod schemas generated from our Prisma models.
- They are used on the server to validate DB-shaped objects and to build curated DTOs.
- Clients should not import anything from here directly.

How are these files created?
- The Prisma schema declares a generator in `prisma/schema.prisma`:
  - `generator zod { provider = "prisma-zod-generator" output = "../src/server/zod" }`
- Running the Prisma generate step produces these files.

How to regenerate
- Run: `pnpm prisma generate`
- This runs the Prisma generators, including `prisma-zod-generator`, and updates this folder.

Do not edit manually
- Files here are derived from the Prisma schema and will be overwritten.
- Make changes in `prisma/schema.prisma` and then regenerate.

Where to find public types and inputs
- Public DTO type: `src/shared/types/release-version.ts`
- Public input schemas (for forms/APIs): `src/shared/schemas/`
- Server DTO helper (model → DTO): `src/server/zod/dto/release-version.dto.ts`

