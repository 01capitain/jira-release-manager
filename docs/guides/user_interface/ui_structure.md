# UI Structure Nuances

This document outlines patterns for the app shell, navigation, and breadcrumbs to keep the UI consistent.

## App Shell & Navigation

- Location: `src/components/layout/app-shell.tsx`
- Sidebar navigation is driven by a hardcoded `NAV_GROUPS` array of groups and items.
- When adding a route:
  - Create the page under `src/app/.../page.tsx`.
  - Add a link to `NAV_GROUPS` for discovery.
  - Ensure the parent group is expandable and auto-highlights when any child is active.

### Navigation Components

- **Internal Links**: Always use the `Link` component from `next/link` instead of HTML `<a>` tags for internal client-side navigation.
  - This prevents full page reloads and maintains SPA behavior.
  - Import: `import Link from 'next/link'`
  - Usage: Replace `<a href="/internal-path">` with `<Link href="/internal-path">`
  - Preserve `className` and other props on the Link component.
  - Example:

    ```tsx
    // ❌ Don't use <a> for internal navigation
    <a href="/settings" className="underline">Settings</a>

    // ✅ Use Link component instead
    <Link href="/settings" className="underline">Settings</Link>
    ```

## Breadcrumbs

- Breadcrumb labels come from a route segment → label map in `computeCrumbs`.
- Add entries for new segments to keep breadcrumbs readable and human-friendly.
- Last crumb is rendered without an `href` to indicate the current page.

## Theming

- The header area includes the theme toggle; all views should render legibly in both light and dark modes.
- Prefer existing `ui/*` primitives for consistent theming and spacing.

## Client vs Server Components

- Route pages are Server Components by default; add `"use client"` at the top when using hooks or client-only libraries.
- Co-locate route-specific components under the route directory (e.g., `src/app/versions/releases/components/*`).
