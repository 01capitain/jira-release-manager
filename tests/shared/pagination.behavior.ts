import type {
  NormalizedPaginatedRequest,
  PaginatedRequest,
  PaginatedResponse,
} from "~/shared/types/pagination";

type PaginationScenario = {
  totalItems: number;
  pageSize: number;
};

type NormalizeParams<TSortBy extends string> = (
  input: Partial<PaginatedRequest<TSortBy>>,
) => NormalizedPaginatedRequest<TSortBy>;

export type PaginationBehaviorOptions<TItem, TSortBy extends string> = {
  suiteName: string;
  scenario: PaginationScenario;
  maxPageSize: number;
  sortFields: readonly TSortBy[];
  makeRequest: (
    params: NormalizedPaginatedRequest<TSortBy>,
  ) => Promise<PaginatedResponse<TItem>>;
  normalizeParams: NormalizeParams<TSortBy>;
  assertSorted?: (items: TItem[], sortBy: TSortBy | `-${TSortBy}`) => void;
};

export const registerPaginationBehaviorTests = <TItem, TSortBy extends string>(
  options: PaginationBehaviorOptions<TItem, TSortBy>,
) => {
  const {
    suiteName,
    scenario,
    sortFields,
    makeRequest,
    normalizeParams,
    maxPageSize,
    assertSorted,
  } = options;

  const [defaultSort] = sortFields;
  if (!defaultSort) {
    throw new Error(
      "registerPaginationBehaviorTests requires at least one sort field",
    );
  }

  const sortVariants: Array<TSortBy | `-${TSortBy}`> = sortFields.flatMap(
    (field) => [field, `-${field}` as const],
  );

  describe(suiteName, () => {
    test("applies pagination boundaries", async () => {
      const firstParams = normalizeParams({
        page: 1,
        pageSize: scenario.pageSize,
        sortBy: `-${defaultSort}` as const,
      });
      const firstPage = await makeRequest(firstParams);
      expect(firstPage.pagination.page).toBe(1);
      expect(firstPage.data).toHaveLength(
        Math.min(scenario.pageSize, scenario.totalItems),
      );
      expect(firstPage.pagination.totalItems).toBe(scenario.totalItems);
      expect(firstPage.pagination.hasNextPage).toBe(
        scenario.totalItems > scenario.pageSize,
      );

      const secondParams = normalizeParams({
        page: 2,
        pageSize: scenario.pageSize,
        sortBy: firstParams.sortBy,
      });
      const secondPage = await makeRequest(secondParams);
      const expectedSecondLength = Math.max(
        scenario.totalItems - scenario.pageSize,
        0,
      );
      expect(secondPage.pagination.page).toBe(2);
      expect(secondPage.data).toHaveLength(expectedSecondLength);
      expect(secondPage.pagination.hasNextPage).toBe(false);
    });

    test("respects explicit limits", async () => {
      const limit = Math.max(1, Math.floor(scenario.pageSize / 2));
      const params = normalizeParams({
        page: 1,
        pageSize: limit,
        sortBy: `-${defaultSort}` as const,
      });
      const page = await makeRequest(params);
      expect(page.data.length).toBe(limit);
      expect(page.pagination.pageSize).toBe(limit);
    });

    test("clamps to configured maximum page size", async () => {
      const params = normalizeParams({
        page: 1,
        pageSize: maxPageSize * 10,
        sortBy: `-${defaultSort}` as const,
      });
      expect(params.pageSize).toBeLessThanOrEqual(maxPageSize);
      const page = await makeRequest(params);
      expect(page.pagination.pageSize).toBeLessThanOrEqual(maxPageSize);
    });

    test("accepts all valid sort options", async () => {
      for (const sortBy of sortVariants) {
        const params = normalizeParams({
          page: 1,
          pageSize: scenario.pageSize,
          sortBy,
        });
        const page = await makeRequest(params);
        expect(page.pagination.page).toBe(1);
        if (assertSorted) {
          assertSorted(page.data, sortBy);
        }
      }
    });
    test("handles out-of-bounds page requests", async () => {
      const params = normalizeParams({
        page: 9999,
        pageSize: scenario.pageSize,
        sortBy: `-${defaultSort}` as const,
      });
      const page = await makeRequest(params);
      expect(page.data).toHaveLength(0);
      expect(page.pagination.hasNextPage).toBe(false);
    });
  });
};
