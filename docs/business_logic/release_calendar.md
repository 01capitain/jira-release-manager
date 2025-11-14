# Release Calendar View

The releases page exposes an optional calendar visualization so operators can understand how frequently a release produces builds.

- Location: `src/app/versions/releases/page.tsx` toggles between the accordion and the calendar panel without routing away from `/versions/releases`.
- Data source: the client reuses the cached payload from `useReleasesWithBuildsQuery`. No additional REST request is fired when the calendar opens.
- Trigger: a “View calendar” icon button on each release row activates the calendar for that specific release and stores the selected release in local state until the user returns to the accordion.

## Event Model

Every calendar entry is derived from `BuiltVersion.createdAt`. Events use the shape documented below and live entirely in memory on the client.

```ts
type ReleaseCalendarEvent = {
  builtVersionId: UuidV7;
  builtVersionName: string;
  timestamp: ISO8601;
  statusLabel?: string;
  components: Array<{ name: string; color?: string }>;
};
```

- The `statusLabel` field is optional and is reserved for future lifecycle timestamps (e.g., “Marked active”). The helper `mapBuiltVersionsToCalendarEvents` merges those optional occurrences with the default `createdAt` items.
- Events with identical `builtVersionId` values are kept separate so we can show a timeline for the same build transitioning across statuses.
- `components` lists the deployed components returned under the `builtVersions.deployedComponents` relation plus their release-component color (looked up from the release component catalog) so the calendar can render per-component chips directly from cached data.

## UX Behavior

- Heading: `Release {name} calendar` with focus transfer for accessibility. View toggles now live in the accordion header (calendar/list icons) so the calendar sits inline with the expanded release card.
- Month initialization: the calendar opens on the month of the release creation date; when unavailable, it falls back to the current month.
- Only weekdays (Monday–Friday) are rendered so the layout mirrors the operational work week.
- Each calendar cell renders every event chip (built name + component chips) with vertically expanding rows (no scrollbars) so the entire work week remains readable even with many deployments.
- The UI respects both light and dark mode via shared color utilities; the `BuiltVersionCalendarEvent` component is the single source of styling for all chips rendered inside the calendar.
