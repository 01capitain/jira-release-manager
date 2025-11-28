import { mapPatchesToCalendarEvents } from "~/app/versions/releases/lib/calendar-events";
import type { ReleaseVersionWithPatchesDto } from "~/shared/types/release-version-with-patches";
import type { UuidV7 } from "~/shared/types/uuid";
import type { ISO8601 } from "~/shared/types/iso8601";

const uuid = (value: string) => value as UuidV7;
const iso = (value: string) => value as ISO8601;

const releaseStub: ReleaseVersionWithPatchesDto = {
  id: uuid("00000000-0000-0000-0000-000000000123"),
  name: "1.0.0",
  releaseTrack: "Future",
  createdAt: iso("2024-03-15T00:00:00.000Z"),
  patches: [
    {
      id: uuid("00000000-0000-0000-0000-000000000201"),
      name: "1.0.0",
      versionId: uuid("00000000-0000-0000-0000-000000000123"),
      createdAt: iso("2024-03-16T10:00:00.000Z"),
      currentStatus: "in_development",
      deployedComponents: [
        {
          id: uuid("00000000-0000-0000-0000-000000000401"),
          releaseComponentId: uuid("00000000-0000-0000-0000-000000000501"),
          patchId: uuid("00000000-0000-0000-0000-000000000201"),
          name: "web-api",
          increment: 0,
          createdAt: iso("2024-03-16T10:00:00.000Z"),
        },
      ],
    },
    {
      id: uuid("00000000-0000-0000-0000-000000000202"),
      name: "1.0.1",
      versionId: uuid("00000000-0000-0000-0000-000000000123"),
      createdAt: iso("2024-03-18T09:00:00.000Z"),
      currentStatus: "in_development",
      deployedComponents: [],
    },
  ],
};

describe("mapPatchesToCalendarEvents", () => {
  it("maps patches to calendar events", () => {
    const events = mapPatchesToCalendarEvents(releaseStub, [], {
      [uuid("00000000-0000-0000-0000-000000000501")]: { color: "rose" },
    });
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      patchId: releaseStub.patches[0]?.id,
      patchName: releaseStub.patches[0]?.name,
      timestamp: releaseStub.patches[0]?.createdAt,
      components: [{ name: "web-api", color: "rose" }],
    });
  });

  it("includes extra occurrences alongside patches", () => {
    const events = mapPatchesToCalendarEvents(
      releaseStub,
      [
        {
          patchId: uuid("00000000-0000-0000-0000-000000000201"),
          patchName: "1.0.0",
          timestamp: iso("2024-03-19T09:00:00.000Z"),
          statusLabel: "Marked active",
          components: [{ name: "mobile", color: "sky" }],
        },
      ],
      {
        [uuid("00000000-0000-0000-0000-000000000501")]: { color: "rose" },
      },
    );
    expect(events).toHaveLength(3);
    expect(events.at(-1)).toMatchObject({
      statusLabel: "Marked active",
      components: [{ name: "mobile", color: "sky" }],
    });
  });
});
