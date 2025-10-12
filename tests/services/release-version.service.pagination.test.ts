import type { PrismaClient } from "@prisma/client";

import { ReleaseVersionService } from "~/server/services/release-version.service";
import { ReleaseVersionListQuerySchema } from "~/server/rest/controllers/release-versions.controller";
import type { ReleaseVersionDto } from "~/shared/types/release-version";
import { registerPaginationBehaviorTests } from "../shared/pagination.behavior";

type MockRelease = {
  id: string;
  name: string;
  createdAt: Date;
};

const makeReleases = (count: number): MockRelease[] => {
  return Array.from({ length: count }, (_, index) => {
    const idSuffix = (index + 1).toString(16).padStart(12, "0");
    return {
      id: `00000000-0000-7000-8000-${idSuffix}`,
      name: `Version ${String(index + 1).padStart(3, "0")}`,
      createdAt: new Date(2024, 0, index + 1),
    };
  });
};

const createMockDb = (records: MockRelease[]) => {
  return {
    releaseVersion: {
      count: jest.fn(async () => records.length),
      findMany: jest.fn(
        async ({
          orderBy,
          skip = 0,
          take = records.length,
        }: {
          orderBy: {
            createdAt?: "asc" | "desc";
            name?: "asc" | "desc";
          };
          skip?: number;
          take?: number;
        }) => {
          const field =
            (Object.keys(orderBy)[0] as "createdAt" | "name" | undefined) ??
            "createdAt";
          const direction =
            orderBy[field] ?? (field === "createdAt" ? "desc" : "asc");
          const sorted = [...records].sort((a, b) => {
            const multiplier = direction === "asc" ? 1 : -1;
            if (field === "createdAt") {
              return (
                (a.createdAt.getTime() - b.createdAt.getTime()) * multiplier
              );
            }
            return a.name.localeCompare(b.name) * multiplier;
          });
          return sorted
            .slice(skip, skip + take)
            .map(({ id, name, createdAt }) => ({
              id,
              name,
              createdAt,
            }));
        },
      ),
    },
  };
};

describe("ReleaseVersionService.list pagination", () => {
  const records = makeReleases(15);
  const db = createMockDb(records);
  const service = new ReleaseVersionService(db as unknown as PrismaClient);

  registerPaginationBehaviorTests<ReleaseVersionDto, "createdAt" | "name">({
    suiteName: "Release versions list",
    scenario: { totalItems: records.length, pageSize: 10 },
    maxPageSize: 100,
    sortFields: ["createdAt", "name"],
    makeRequest: (params) => service.list(params),
    normalizeParams: (input) =>
      ReleaseVersionListQuerySchema.parse({
        page: input.page,
        pageSize: input.pageSize,
        sortBy: input.sortBy,
      }),
    assertSorted: (items, sortBy) => {
      const descending = sortBy.startsWith("-");
      const field = (descending ? sortBy.slice(1) : sortBy) as
        | "createdAt"
        | "name";
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1]!;
        const curr = items[i]!;
        if (field === "createdAt") {
          const prevTs = new Date(prev.createdAt).getTime();
          const currTs = new Date(curr.createdAt).getTime();
          if (descending) {
            expect(prevTs).toBeGreaterThanOrEqual(currTs);
          } else {
            expect(prevTs).toBeLessThanOrEqual(currTs);
          }
        } else {
          const comparison = prev.name.localeCompare(curr.name);
          if (descending) {
            expect(comparison).toBeGreaterThanOrEqual(0);
          } else {
            expect(comparison).toBeLessThanOrEqual(0);
          }
        }
      }
    },
  });
});
