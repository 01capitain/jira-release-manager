# Local Seed Playbook

This guide captures how to turn a manually curated local dataset into an automated Prisma seed so developers can reset their database and recover the same realistic baseline.

## Prerequisites

- Authenticate once through Discord so Prisma has a `User` row to attach ownership to.
- Ensure `NODE_ENV=development` before running any reset or seed command.

## 1. Capture The Dataset

1. Start with a clean database: `NODE_ENV=development pnpm db:reset`.
2. Configure everything through the UI until the data matches the desired golden state.
3. Run an export script (e.g. `tsx scripts/dump-seed-data.ts`) that:
   - Instantiates `PrismaClient`.
   - Queries the entities that need to be recreated (`ReleaseVersion` with `builtVersions`, `componentVersions`, etc.).
   - Strips volatile fields such as `createdAt`, `updatedAt`, or transient IDs if they do not matter.
   - Persists the snapshot as `prisma/seed-data.json`.
4. Confirm the exported JSON aligns with the rules in `docs/guides/business_logic`, especially the built version seeding behaviour.

## 2. Build The Seed Script

Create `prisma/seed.ts` that:

- Guards against non-development environments:

  ```ts
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Seeds only run in development");
  }
  ```

- Imports the JSON snapshot and uses `PrismaClient`.
- Wraps writes in `prisma.$transaction` and uses `deleteMany`/`upsert` to stay idempotent.
- Resolves the creator user:
  - Prefer looking up an existing user by email (`SEED_OWNER_EMAIL`) or grab the first user if only one exists.
  - If no user matches, create a dedicated “Seed Owner” user so the dataset can be replayed without OAuth.
- Applies the JSON payload, reusing UUIDs for deterministic IDs when appropriate.

Register the script in `package.json`:

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

## 3. Wire Into The Reset Flow

Update `scripts/dev-db-reset.mjs` to invoke the seed after the final `prisma db push`:

```js
run("pnpm exec prisma db push");
run("pnpm prisma db seed");
```

This keeps the existing development guard intact while guaranteeing every `db:reset` ends with the baseline data.

## 4. Day-To-Day Workflow

1. When the golden dataset changes, repeat the UI steps and rerun the export script to refresh `prisma/seed-data.json`.
2. Commit the updated JSON and any code changes once reviewed.
3. Team members can reset at any time with `NODE_ENV=development pnpm db:reset` and immediately get the curated data.

## Notes

- If Docker bootstrap (`./start-database.sh`) needs the same dataset, run `pnpm prisma db seed` right after the container starts instead of duplicating logic in SQL.
- Keep large fixture fragments (e.g. component matrices) in separate helper files imported by the seed script to simplify future edits.
