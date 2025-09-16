# Client App Structure

This project uses Next.js App Router with tRPC and shared schemas/types. This guide explains where to place client code and how files are organized.

## Repository Layout (client‑relevant)

- `src/app` – Next.js routes (RSC by default, opt‑in to client with `"use client"`).
  - Example: `src/app/versions/builds/page.tsx` and related `components/` folder colocated under the route segment.
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
  - `src/app/versions/builds/components/built-version-card.tsx`
- Reuse global primitives from `src/components/ui` to keep styling consistent.

## Data Fetching

- Use `api.<router>.<procedure>.useQuery()` and `.useMutation()` from `~/trpc/react` inside client components.
- Keep optimistic updates localized by invalidating or setting query data via `api.useUtils()`.

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

