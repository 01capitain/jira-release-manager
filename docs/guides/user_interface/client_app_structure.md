# Client App Structure

This project uses Next.js App Router with tRPC and shared schemas/types. This guide explains where to place client code and how files are organized.

## Repository Layout (client‑relevant)

- `src/app` – Next.js routes (RSC by default, opt‑in to client with `"use client"`).
  - Example: `src/app/versions/releases/page.tsx` and related `components/` folder colocated under the route segment.
- `src/components` – Reusable UI components.
  - `src/components/ui/*` – small, composable primitives (buttons, card, inputs, etc.).
  - `src/components/layout/*` – layout shell, navigation, global UI.
  - `src/components/theme/*` – theme provider and mode toggle (light/dark).
- `src/trpc` – Client hooks for tRPC (`api` factory, query client setup).
- `src/shared` – Cross‑cutting, transport‑safe code.
  - `types/*` – DTO and helper types shared by server and client.
  - `schemas/*` – Zod schemas for request/response validation (server validates; client may import for parsing).
- `src/server` – Server‑only code (do not import into client components).
  - `services/*` – domain services (business logic, DB access via Prisma).
  - `api/*` – tRPC routers & context.
  - `zod/*` – server‑generated Zod schemas from Prisma.

## Route Co‑location

- Prefer co‑locating route‑specific components under the route directory, e.g.:
  - `src/app/versions/releases/components/release-version-card.tsx`
- Reuse global primitives from `src/components/ui` to keep styling consistent.

## Data Fetching

- Use `api.<router>.<procedure>.useQuery()` / `.useMutation()` from `~/trpc/react` when a tRPC router exists for the flow.
- For REST endpoints (e.g., `/api/v1/release-components`), colocate React Query helpers under the route directory (see `src/app/versions/components/api.ts`). Wrap calls with `getJson` / `postJson` from `src/lib/rest-client.ts` so transport errors surface as `RestApiError`.
- Keep optimistic updates localized by invalidating or updating cached data through React Query (either via `api.useUtils()` for tRPC or `queryClient.setQueryData()` for REST) and follow the page-1 insertion policy from `docs/guides/business_logic/entity_management_policies.md`.

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
