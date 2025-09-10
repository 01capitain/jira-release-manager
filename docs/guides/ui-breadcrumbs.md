# Breadcrumbs

Breadcrumbs render in the floating header and are derived from the current pathname.

Location: `src/components/layout/app-shell.tsx` (function `computeCrumbs`).

## How labels are chosen

- Each URL segment is mapped to a human‑readable label via a simple object:

```ts
const map: Record<string, string> = {
  versions: "Versions",
  releases: "Release Versions",
  builds: "Built Versions",
  components: "Release Components",
  "jira-settings": "Jira settings",
};
```

- Any segment not in the map falls back to `seg.replace(/-/g, " ")`.

## Adding new labels

1) Add your route to the sidebar (see `ui-sidebar.md`).
2) Add a mapping entry for the last URL segment in `computeCrumbs`.

Example:

```ts
// /admin/audits → "Admin / Audits"
map["admin"] = "Admin";
map["audits"] = "Audits";
```

## Current page

- The last crumb is rendered without an `href` and with `aria-current="page"` to indicate the current page.
## Advanced

- If you need dynamic breadcrumb titles (e.g., entity names), consider passing a client component as a child that renders a custom breadcrumb next to the default one, or extend `computeCrumbs` to accept an override map via React context.

