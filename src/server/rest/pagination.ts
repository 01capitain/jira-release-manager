import type {
  PaginatedResponse,
  PaginationInfo,
} from "~/shared/types/pagination";

export const buildPaginationInfo = (
  page: number,
  pageSize: number,
  totalItems: number,
): PaginationInfo => ({
  page,
  pageSize,
  totalItems,
  hasNextPage: page * pageSize < totalItems,
});

export const buildPaginatedResponse = <T>(
  data: T[],
  page: number,
  pageSize: number,
  totalItems: number,
): PaginatedResponse<T> => ({
  data,
  pagination: buildPaginationInfo(page, pageSize, totalItems),
});
