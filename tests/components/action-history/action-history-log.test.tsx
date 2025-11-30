/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import * as ReactQuery from "@tanstack/react-query";
import type { ActionHistoryEntryDto } from "~/shared/types/action-history";
import type { PaginatedResponse } from "~/shared/types/pagination";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
import { UuidV7Schema } from "~/shared/types/uuid";
import { ActionHistoryLog } from "~/components/action-history/action-history-log";

jest.mock("@tanstack/react-query", () => {
  const original = jest.requireActual("@tanstack/react-query");
  return {
    ...original,
    useInfiniteQuery: jest.fn(),
  };
});

const useInfiniteQueryMock = ReactQuery.useInfiniteQuery as jest.MockedFunction<
  typeof ReactQuery.useInfiniteQuery
>;

const makeEntry = (
  overrides: Partial<ActionHistoryEntryDto> = {},
): ActionHistoryEntryDto => ({
  id: UuidV7Schema.parse("018f1a50-0000-7000-9000-00000000aaaa"),
  actionType: "releaseVersion.update",
  message: "Release 123 updated",
  status: "success",
  createdAt: IsoTimestampSchema.parse("2024-01-01T12:00:00Z"),
  createdBy: {
    id: UuidV7Schema.parse("018f1a50-0000-7000-9000-00000000bbbb"),
    name: "Tester",
    email: "tester@example.com",
  },
  subactions: [
    {
      id: UuidV7Schema.parse("018f1a50-0000-7000-9000-00000000cccc"),
      subactionType: "releaseVersion.track.update",
      message: "Track moved",
      status: "success",
      createdAt: IsoTimestampSchema.parse("2024-01-01T12:00:01Z"),
      metadata: { from: "Future", to: "Active" },
    },
  ],
  metadata: { releaseTrack: "Active" },
  ...overrides,
});

describe("ActionHistoryLog", () => {
  beforeEach(() => {
    useInfiniteQueryMock.mockReturnValue({
      data: {
        pages: [
          {
            data: [makeEntry()],
            pagination: {
              page: 1,
              pageSize: 5,
              hasNextPage: false,
              totalItems: 1,
            },
          },
        ],
      } as {
        pages: Array<{
          data: ActionHistoryEntryDto[];
          pagination: PaginatedResponse<ActionHistoryEntryDto>["pagination"];
        }>;
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useInfiniteQueryMock>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("highlights release track updates with a colored indicator", () => {
    render(<ActionHistoryLog />);

    const entry = screen.getByText(/Release 123 updated/i);
    expect(entry).toBeTruthy();

    const sub = screen.getByText(/Track updated from Future to/i);
    expect(sub).toBeTruthy();

    const indicator = sub.parentElement?.querySelector("[aria-hidden='true']");
    expect(indicator).toBeTruthy();
    expect(indicator?.className).toContain("rounded-full");
  });
});
