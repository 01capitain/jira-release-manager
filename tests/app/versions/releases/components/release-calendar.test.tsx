/**
 * @jest-environment jsdom
 */

import { render } from "@testing-library/react";
import ReleaseCalendar from "~/app/versions/releases/components/release-calendar";
import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";
import type { ReleaseCalendarEvent } from "~/shared/types/release-calendar";
import type { UuidV7 } from "~/shared/types/uuid";
import type { ISO8601 } from "~/shared/types/iso8601";

const uuid = (value: string) => value as UuidV7;
const iso = (value: string) => value as ISO8601;

const release: ReleaseVersionWithBuildsDto = {
  id: uuid("00000000-0000-0000-0000-000000001000"),
  name: "2.1.0",
  createdAt: iso("2024-01-01T00:00:00.000Z"),
  builtVersions: [],
};

const events: ReleaseCalendarEvent[] = [
  {
    builtVersionId: uuid("00000000-0000-0000-0000-000000002000"),
    builtVersionName: "2.1.0",
    timestamp: iso("2024-01-05T12:00:00.000Z"),
    components: [],
  },
];

describe("ReleaseCalendar", () => {
  it("renders release context without crashing", () => {
    render(<ReleaseCalendar release={release} events={events} />);
    expect(true).toBe(true);
  });
});
