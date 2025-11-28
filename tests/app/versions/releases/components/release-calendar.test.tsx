/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReleaseCalendar from "~/app/versions/releases/components/release-calendar";
import type { ReleaseVersionWithPatchesDto } from "~/shared/types/release-version-with-patches";
import type { ReleaseCalendarEvent } from "~/shared/types/release-calendar";
import type { UuidV7 } from "~/shared/types/uuid";
import type { ISO8601 } from "~/shared/types/iso8601";

const uuid = (value: string) => value as UuidV7;
const iso = (value: string) => value as ISO8601;

const createRelease = (
  overrides: Partial<ReleaseVersionWithPatchesDto> = {},
): ReleaseVersionWithPatchesDto => ({
  id: uuid("00000000-0000-0000-0000-000000001000"),
  name: "2.1.0",
  releaseTrack: "Future",
  createdAt: iso("2024-01-01T00:00:00.000Z"),
  patches: [],
  ...overrides,
});

const createEvent = (
  overrides: Partial<ReleaseCalendarEvent> = {},
): ReleaseCalendarEvent => ({
  patchId: uuid("00000000-0000-0000-0000-000000002000"),
  patchName: "API build",
  timestamp: iso("2024-01-05T12:00:00.000Z"),
  statusLabel: "Created",
  components: [
    {
      name: "API",
      color: "sky",
    },
  ],
  ...overrides,
});

describe("ReleaseCalendar", () => {
  it("shows the empty-state message without rendering the calendar grid", () => {
    render(<ReleaseCalendar release={createRelease()} events={[]} />);

    const emptyState = screen.getByText(
      /does not have any builds yet\. New builds will appear/i,
    );
    expect(emptyState).toBeTruthy();
    expect(screen.queryByText(/Showing builds from/i)).toBeNull();
  });

  it("renders release context, summary, and feature chips when events exist", () => {
    render(
      <ReleaseCalendar
        release={createRelease()}
        events={[createEvent(), createEvent({ patchName: "Web" })]}
      />,
    );

    const heading = screen.getByRole("heading", {
      name: /Release 2\.1\.0 calendar/i,
    });
    expect(heading).toBeTruthy();
    expect(screen.getByText(/Showing builds from/i)).toBeTruthy();
    expect(screen.getByText("API build")).toBeTruthy();
    expect(screen.getByText("Web")).toBeTruthy();
  });

  it("toggles the custom range picker when the summary control is clicked", () => {
    render(
      <ReleaseCalendar release={createRelease()} events={[createEvent()]} />,
    );

    const toggle = screen.getByRole("button", { name: /Showing builds from/i });
    const initialGridCount = screen.queryAllByRole("grid").length;
    fireEvent.click(toggle);
    const expandedGridCount = screen.queryAllByRole("grid").length;
    expect(expandedGridCount).toBeGreaterThan(initialGridCount);
    fireEvent.click(toggle);
    expect(screen.queryAllByRole("grid").length).toBe(initialGridCount);
  });

  it("moves focus to the heading whenever the release changes", async () => {
    const { rerender } = render(
      <ReleaseCalendar release={createRelease()} events={[createEvent()]} />,
    );

    const initialHeading = screen.getByRole("heading", {
      name: /Release 2\.1\.0 calendar/i,
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(initialHeading);
    });

    rerender(
      <ReleaseCalendar
        release={createRelease({
          id: uuid("00000000-0000-0000-0000-000000001111"),
          name: "3.0.0",
        })}
        events={[createEvent({ patchName: "CLI" })]}
      />,
    );

    const nextHeading = screen.getByRole("heading", {
      name: /Release 3\.0\.0 calendar/i,
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(nextHeading);
    });
  });
});
