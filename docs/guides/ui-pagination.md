# UI Pagination

This project ships a small, reusable pagination component that follows the UI look used across the app.

Location: `src/components/ui/pagination.tsx`

## Props

- `total` (number) – total number of items.
- `pageSize` (number) – items per page.
- `page` (number) – current page (1‑indexed).
- `onPageChange(page: number)` – callback to update page.
- `siblingCount?` (number) – how many pages to show on each side (default 1).

## Basic usage

```tsx
"use client";
import * as React from "react";
import { Pagination } from "~/components/ui/pagination";

export default function Example() {
  const [page, setPage] = React.useState(1);
  const items = Array.from({ length: 42 }, (_, i) => ({ id: i + 1 }));
  const pageSize = 9;
  const start = (page - 1) * pageSize;
  const current = items.slice(start, start + pageSize);

  return (
    <div>
      {/* …render `current` in a grid… */}
      <Pagination total={items.length} pageSize={pageSize} page={page} onPageChange={setPage} />
    </div>
  );
}
```

## Patterns

- Keep `page` in state close to where items are sliced to avoid double sources of truth.
- For server pagination, mirror `page` in the URL (via search params) and re‑fetch on change.
- Accessibility: the component uses `aria-current="page"` on the active page. Place it near the grid and keep tab order natural.
- Styling: variants match our button styles (default/secondary). If you change global button tokens, pagination updates automatically.

## Grid sizing

- The releases view uses a 3×3 grid (9 items). Adjust `pageSize` to match your grid.
- If your first cell is reserved (e.g., an “Add +” card), subtract 1 from the capacity on page 1 when slicing.

