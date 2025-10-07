# Service Conventions

This guide defines patterns for implementing domain services, with a focus on semantic IDs and clear boundaries.

## Semantic IDs in Service APIs

- Use Prisma model‑anchored semantic ID types in service method signatures:
  - `userId: User['id']`, `builtVersionId: BuiltVersion['id']`, `versionId: ReleaseVersion['id']`, etc.
- Rationale:
  - Semantics: conveys which entity the ID belongs to.
  - Stability: if the underlying ID type changes, references update via the Prisma model type.
  - Simplicity: keeps service boundaries minimal and transport‑agnostic.
- Do not accept whole entities unless you require additional fields beyond the ID. Prefer `id` parameters for minimal coupling.
- At the transport boundary (tRPC/REST), validate inputs with Zod (e.g., `z.uuidv7()`), then pass semantic IDs to services.

## Single Responsibility & Composition

- Keep services cohesive:
  - Example: `BuiltVersionService` handles creation logic for Releases (Built Versions).
  - Example: `BuiltVersionStatusService` owns lifecycle transitions and transition history.
- Compose services in routers/controllers when orchestration is necessary. Avoid injecting services into each other unless a hard dependency exists.

### Action History Hooks

- Service methods that perform user-triggered mutations accept an optional `{ logger?: ActionLogger }` parameter.
- When provided, push deterministic subaction entries (e.g., `builtVersion.persist`, `componentVersion.populate`) after successful operations so the session history renders in order.
- Do not wrap history writes in the same Prisma transaction as the domain change; collect metadata inside the transaction and emit subactions after commit to keep logs even when the transaction aborts later.

**Example:**

```typescript
async create(userId: string, data: Input, options?: { logger?: ActionLogger }) {
  // Collect metadata during transaction
  const result = await this.db.$transaction(async (tx) => {
    const entity = await tx.entity.create({ data });
    return { id: entity.id, name: entity.name };
  });

  // Emit subaction after commit
  await options?.logger?.subaction({
    subactionType: "entity.persist",
    status: "success",
    message: `Entity ${result.name} persisted`,
    metadata: { id: result.id },
  });

  return result;
}

## Transitions & DX Pattern

- For state machines, provide both:
  - A single internal executor: `transition(id, action, userId)` that encapsulates validation and persistence.
  - Explicit convenience methods that delegate to the executor: `startDeployment(...)`, `cancelDeployment(...)`, `markActive(...)`, etc., to improve discoverability and enable action‑specific policies later.

## Error Shape

- Throw precise errors for invalid transitions with a stable `code` and `details` object when possible.
- Routers should translate service errors into structured API errors without leaking internal error objects.

## Timestamps to Clients

- Convert `Date` to strict ISO 8601 (`Z` suffix) at DTO boundary and validate with the shared `IsoTimestampSchema`.
