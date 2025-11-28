/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import type { ActionHistoryEntryDto } from "~/shared/types/action-history";
import type { PaginatedResponse } from "~/shared/types/pagination";
import { ActionHistoryLog } from "~/components/action-history/action-history-log";

jest.mock("@tanstack/react-query", () => {
  const original = jest.requireActual("@tanstack/react-query");
  return {
    ...original,
    useInfiniteQuery: jest.fn(),
  };
});

const useInfiniteQueryMock = require("@tanstack/react-query")
  .useInfiniteQuery as jest.MockedFunction<typeof import("@tanstack/react-query").useInfiniteQuery>;

const makeEntry = (
  overrides: Partial<ActionHistoryEntryDto> = {},
): ActionHistoryEntryDto => ({
  id: "018f1a50-0000-7000-9000-00000000aaaa",
  actionType: "releaseVersion.track.update",
  message: "Release 123 track updated",
  status: "success",
  createdAt: new Date("2024-01-01T12:00:00Z").toISOString(),
  createdBy: {
    id: "user-1",
    name: "Tester",
    email: "tester@example.com",
  },
  subactions: [],
  metadata: { releaseTrack: "Future" },
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
      } as PaginatedResponse<ActionHistoryEntryDto>,
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

    const entry = screen.getByText(/Release 123 track updated to/i);
    expect(entry).toBeTruthy();

    const indicator = entry.parentElement?.querySelector(
      "[aria-hidden='true']",
    );
    expect(indicator).toBeTruthy();
    expect(indicator?.className).toContain("rounded-full");
  });
});
