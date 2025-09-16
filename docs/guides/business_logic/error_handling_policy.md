# Error Handling Policy (Current)

This document captures the current patterns for surfacing and handling errors in the app.

## TRPC Error Formatter

- The tRPC initialization installs an error formatter and a dev timing middleware.
- Zod validation errors are flattened and attached under `shape.data.zodError`.

## Router Patterns

- Queries typically pass through; mutations validate input with Zod.
- Some procedures throw generic `Error` objects that embed a JSON string payload (e.g., transition invalidation):
  - `throw new Error(JSON.stringify({ code, message, details }))`
- Consumers should parse `error.message` in these cases to extract `{ code, details }`.

## Service-Level Errors

- Services throw `Error` with `code` and `details` attached via `Object.assign` for precise invalid states (e.g., `INVALID_TRANSITION`).
- Routers may stringify these into the `Error.message` for transport.

## Client-Side UX

- Components often use minimal inline status messages via `role="status"` + `aria-atomic="true"` for short updates.
- There is no global error surface/toast mapping today.

## Known Limitations

- Mixed error shapes (TRPCError vs. JSON-in-message) complicate client handling.
- No standardized error code enum across domains.
- No correlation IDs or contextual logging attached to errors.
- Limited user-facing guidance (e.g., remediation, links).

