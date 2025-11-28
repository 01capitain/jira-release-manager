import type { ReleaseVersionWithPatchesDto } from "~/shared/types/release-version-with-patches";
import type {
  ReleaseCalendarEvent,
  ReleaseCalendarEventComponent,
} from "~/shared/types/release-calendar";

export type ReleaseCalendarExtraOccurrence = {
  patchId: ReleaseCalendarEvent["patchId"];
  patchName: string;
  timestamp: ReleaseCalendarEvent["timestamp"];
  components?: ReleaseCalendarEventComponent[];
  statusLabel?: ReleaseCalendarEvent["statusLabel"];
};

export type ReleaseComponentColorLookup = Record<string, { color?: string }>;

export function mapPatchesToCalendarEvents(
  release: ReleaseVersionWithPatchesDto,
  extraOccurrences: ReleaseCalendarExtraOccurrence[] = [],
  componentLookup: ReleaseComponentColorLookup = {},
): ReleaseCalendarEvent[] {
  const baseEvents: ReleaseCalendarEvent[] = release.patches.map(
    (patch) => ({
      patchId: patch.id,
      patchName: patch.name,
      timestamp: patch.createdAt,
      components: (patch.deployedComponents ?? []).map((component) => ({
        name: component.name,
        color: componentLookup[component.releaseComponentId]?.color,
      })),
    }),
  );

  const mergedExtraEvents: ReleaseCalendarEvent[] = extraOccurrences.map(
    (occurrence) => ({
      patchId: occurrence.patchId,
      patchName: occurrence.patchName,
      timestamp: occurrence.timestamp,
      statusLabel: occurrence.statusLabel,
      components: occurrence.components ?? [],
    }),
  );

  return [...baseEvents, ...mergedExtraEvents];
}
