# Error Handling Policy (Current)

This document captures the current patterns for surfacing and handling errors in the app.

## REST Error Envelope

- REST controllers throw `RestError(status, code, message, details?)` when validation or domain invariants fail.
- `parseJsonBody` and `parseSearchParams` automatically translate Zod validation failures into `400` JSON responses using the shared `RestError` envelope.
- Controllers should surface domain failures via `RestError` codes (e.g., `NOT_FOUND`, `VALIDATION_ERROR`, `PRECONDITION_FAILED`) so clients can map them without parsing strings.

## Service-Level Errors

- Services throw `Error` with `code` and `details` attached via `Object.assign` for precise invalid states (e.g., `INVALID_TRANSITION`).
- Controllers convert these into `RestError` instances, preserving structured metadata in the `details` field where helpful.

## Client-Side UX

- Components surface inline status updates via `role="status"` + `aria-atomic="true"` for short-lived messages.
- Cross-route notifications share the `toast` helper (`src/lib/toast.ts`) which wraps the global Sonner `<Toaster />` mounted in the app shell so messages are non-blocking and theme-aware.
- Fetch helpers in `src/lib/rest-client.ts` throw `RestApiError` (extending `Error`) with `status`, `code`, and `details` to keep UI error handling consistent.

## Known Limitations

- No standardized error code enum across domains.
- No correlation IDs or contextual logging attached to errors.
- Limited user-facing guidance (e.g., remediation, links).
