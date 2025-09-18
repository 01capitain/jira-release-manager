# Release Component Naming

This guide defines how names for `ComponentVersion` are generated and where token values are persisted.

## Allowed Tokens

- `{release_version}` — the Release Version name (e.g., `version 178`)
- `{built_version}` — the Built Version name (e.g., `version 178.0`)
- `{increment}` — per‑component increment for this Built Version, starting at `0`

Patterns are validated; unknown tokens or unbalanced braces are rejected. Empty/invalid patterns are skipped during generation, leaving other components unaffected.

## Token Snapshots (Persistence)

To make generated names reproducible and auditable, token values are stored alongside the records:

- `BuiltVersion.tokenValues` — `{ "release_version": string, "increment": number }`
- `ComponentVersion.tokenValues` — `{ "release_version": string, "built_version": string, "increment": number }`

These snapshots capture the exact values used when expanding the pattern for later inspection or re‑rendering.

## Increment Semantics

- Component increments are scoped per `(builtVersionId, releaseComponentId)` and start at `0` for each newly created Built Version.
- Built Version name increments are release‑scoped and tracked using `ReleaseVersion.lastUsedIncrement` (first auto build uses `0`).

## References

- Schema: `prisma/schema.prisma`
- Naming helpers: `src/server/services/component-version-naming.service.ts`
- Creation: `src/server/services/release-version.service.ts`, `src/server/services/built-version.service.ts`
