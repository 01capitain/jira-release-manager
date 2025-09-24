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

