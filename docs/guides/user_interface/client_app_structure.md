# Client App Structure

This project uses Next.js App Router with React Query and shared schemas/types. This guide explains where to place client code and how files are organized.

## Repository Layout (client‑relevant)

- `src/app` – Next.js routes (RSC by default, opt‑in to client with "use client").
  - Example: `src/app/versions/releases/page.tsx` and related `components/` folder colocated under the route segment.
- `src/components` – Reusable UI components.
  - `src/components/ui/*` – small, composable primitives (buttons, card, inputs, etc.).
  - `src/components/layout/*` – layout shell, navigation, global UI.
  - `src/components/theme/*` – theme provider and mode toggle (light/dark).
- `src/lib` – transport helpers (`rest-client`, `query-client`, utility functions).
- `src/shared` – Cross‑cutting, transport‑safe code.
  - `types/*` – DTO and helper types shared by server and client.
  - `schemas/*` – Zod schemas for request/response validation (server validates; client may import for parsing).
- `src/server` – Server‑only code (do not import into client components).
  - `services/*` – domain services (business logic, DB access via Prisma).
  - `rest/controllers/*` – REST handlers registered under `/api/v1`.
  - `zod/*` – server‑generated Zod schemas from Prisma.

## Route Co‑location

- Prefer co‑locating route‑specific components under the route directory, e.g.:
  - `src/app/versions/releases/components/release-version-card.tsx`
- Reuse global primitives from `src/components/ui` to keep styling consistent.

## Data Fetching

- Wrap REST endpoints with helper modules colocated next to the page (see `src/app/versions/components/api.ts`). Each module should expose query keys, fetchers, and React Query hooks that call `getJson` / `postJson` / `requestJson` from `src/lib/rest-client.ts` so transport errors surface as `RestApiError`.
- Keep optimistic updates localized by updating or invalidating cached data with React Query (`queryClient.setQueryData`, `queryClient.invalidateQueries`) and follow the page-1 insertion policy from `docs/guides/business_logic/entity_management_policies.md`.
- Shared pagination contracts live in `src/shared/types/pagination.ts`; reuse them so every list endpoint returns `{ data, pagination }`.

## Accessibility & Themes

- Light/Dark: all components must render legibly in both modes; use existing tokens and variants in `ui/*` primitives.
- Live regions:
  - Use `role="status"` with `aria-atomic="true"` for short ephemeral updates.
  - Avoid `aria-live` on large containers/pages.
- Badges and status chips should provide adequate color contrast in both themes.

## Type Safety Patterns

- Import shared types from `src/shared/types/*` to ensure server/client agreement.
- Status/action unions live in `src/shared/types` and drive UI affordances (e.g., which buttons to show).
- Prefer semantic IDs in services; client code passes opaque strings validated at the router boundary (Zod `uuid`).
