# Sidebar Navigation

The main navigation lives inside the floating container and supports nested groups.

Location: `src/components/layout/app-shell.tsx`

## Structure

- `NAV_GROUPS`: array of groups with optional children:

```ts
type NavGroup = {
  id: string;
  label: string;
  icon?: React.ElementType; // lucide-react icon
  items?: { href: string; label: string }[];
};
```

## Add a page to the sidebar

1) Create a route file under `src/app/.../page.tsx` (Next.js app router).

2) Register the link:

```ts
// In AppShell
const NAV_GROUPS: NavGroup[] = [
  {
    id: "versions",
    label: "Versions",
    icon: Layers,
    items: [
      { href: "/versions/releases", label: "Release Versions" },
      // Add more items here…
    ],
  },
];
```

3) Optional: add a human‑friendly label for the route segment to breadcrumbs (see `computeCrumbs` mapping below).

## Behavior

- Parent groups are expandable; active state is applied when any child route matches.
- Logout is always pinned to the bottom area of the sidebar and should not be moved into groups.
- Mobile: the sidebar can be toggled; links close it on navigation.

