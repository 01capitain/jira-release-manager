# API Contracts and Token Values

- API endpoints (tRPC now, REST later) return DTOs from `src/shared/types`. This ensures the same contract is reused across clients.
- For build and component versioning, we store a `tokenValues` JSON object alongside records. Shape is defined by `TokenValues`:

```ts
type TokenValues = {
  release_version: string;
  built_version?: string;
  increment: number;
}
```

- Services compute names from patterns and persist the token snapshot using `Prisma.InputJsonValue` at the database boundary.
- When transitioning built statuses, a successor built may be created with an incremented version and token snapshot. Component versions for the successor are created or moved later based on user selection.

## Action History Logging

- Mutations triggered by authenticated users (release creation, built creation, status transitions, successor arrangement, release component creation) emit audit entries stored in `ActionLog` and `ActionSubactionLog` tables.
- Each action captures: UUIDv7 id, `actionType`, human-readable `message`, execution `status` (`success | failed | cancelled`), triggering `userId`, and the current session token to scope the feed.
- Subactions provide a single-depth trace for service-level steps (e.g., auto-created successor, seeded component versions) and inherit the parent action id.
- The tRPC endpoint `actionHistory.current` returns the chronological session feed as `ActionHistoryEntryDto` (and `subactions`) for rendering the terminal-style history UI.
- Entries persist even when domain operations throw; failure metadata (error message, action context) is stored on the parent action to aid troubleshooting.
