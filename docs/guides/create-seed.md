# Local Seed Playbook

This guide captures how to turn a manually curated local dataset into an automated Prisma seed so developers can reset their database and recover the same realistic baseline.

## Prerequisites

- Authenticate once through Discord so Prisma has a `User` row to attach ownership to.
- Ensure `NODE_ENV=development` before running any reset or seed command.

## 1. Capture The Dataset

1. Start with a clean database: `pnpm db:reset -- --reseed` (the reset script reads `.env`, so no manual `NODE_ENV` override is needed).
2. Configure everything through the UI until the data matches the desired golden state.
3. Translate the curated data into deterministic fixtures under `tests/fixtures/*.ts`. These modules are the single source of truth for release components, seed users, and release versions (w/ patch + component versions).
4. Confirm the fixtures align with `docs/guides/business_logic`, especially the patch seeding behaviour and naming rules.

## 2. Build The Seed Script

`prisma/seed.ts` imports the fixtures directly and:

- Guards against non-development environments before any writes.
- Wipes only the rows referenced by the fixtures to keep the script idempotent.
- Inserts a dedicated placeholder (`SEED_PLACEHOLDER_USER`) plus the human fixture users so referential integrity stays intact.
- Recreates release components, versions, patches, component versions, and transition history with the UUID/timestamps from the fixtures while also capturing token snapshots.

Register the script in `package.json` so `pnpm run db:seed` executes it:

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

## 3. Wire Into The Reset Flow

Update `scripts/dev-db-reset.mjs` to call `pnpm run db:seed` only when invoked with `--reseed`. This keeps destructive resets fast by default while still guaranteeing `pnpm db:reset -- --reseed` ends with the baseline data.

## 4. Placeholder Ownership Flow

- Seeded records are owned by `SEED_PLACEHOLDER_USER`. On the first successful Discord login, the NextAuth `signIn` event calls `claimSeedOwnership()` which reassigns every placeholder-owned row to the authenticated user and deletes the placeholder.
- If a manual reassignment is needed, run `pnpm run seed:claim-owner <user-id|email>` to invoke the same logic outside the Auth.js hook.

## 5. Day-To-Day Workflow

1. When the golden dataset changes, update the fixture modules and re-run `pnpm run db:seed`.
2. Commit the fixture + seed updates once reviewed.
3. Team members can reset at any time with `pnpm db:reset -- --reseed` and immediately get the curated data owned by whoever signs in first.

## Notes

- If Docker bootstrap (`./start-database.sh`) needs the same dataset, run `pnpm run db:seed` right after the container starts instead of duplicating logic in SQL.
- Keep large fixture fragments (e.g. component matrices) in separate helper files imported by the seed script to simplify future edits.
- The `scripts/entity-expose.mjs` scaffolder can emit a dry-run JSON report for fixtures/tests by setting `ENTITY_EXPOSE_OUTPUT=/path/inside/repo` and `ENTITY_EXPOSE_OUTPUT_ALLOW=true`. Set `NODE_ENV=test` when running inside CI to avoid warnings. See the script header for usage—the guard prevents accidental writes outside the workspace.
