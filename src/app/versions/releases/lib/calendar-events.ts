import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";
import type {
  ReleaseCalendarEvent,
  ReleaseCalendarEventComponent,
} from "~/shared/types/release-calendar";

export type ReleaseCalendarExtraOccurrence = {
  builtVersionId: ReleaseCalendarEvent["builtVersionId"];
  builtVersionName: string;
  timestamp: ReleaseCalendarEvent["timestamp"];
  components?: ReleaseCalendarEventComponent[];
  statusLabel?: ReleaseCalendarEvent["statusLabel"];
};

export type ReleaseComponentColorLookup = Record<string, { color?: string }>;

export function mapBuiltVersionsToCalendarEvents(
  release: ReleaseVersionWithBuildsDto,
  extraOccurrences: ReleaseCalendarExtraOccurrence[] = [],
  componentLookup: ReleaseComponentColorLookup = {},
): ReleaseCalendarEvent[] {
  const baseEvents: ReleaseCalendarEvent[] = release.builtVersions.map(
    (built) => ({
      builtVersionId: built.id,
      builtVersionName: built.name,
      timestamp: built.createdAt,
      components: (built.deployedComponents ?? []).map((component) => ({
        name: component.name,
        color: componentLookup[component.releaseComponentId]?.color,
      })),
    }),
  );

  const mergedExtraEvents: ReleaseCalendarEvent[] = extraOccurrences.map(
    (occurrence) => ({
      builtVersionId: occurrence.builtVersionId,
      builtVersionName: occurrence.builtVersionName,
      timestamp: occurrence.timestamp,
      statusLabel: occurrence.statusLabel,
      components: occurrence.components ?? [],
    }),
  );

  return [...baseEvents, ...mergedExtraEvents];
}
