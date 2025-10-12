export type PaginatedRequest<TSortBy extends string> = {
  page?: number;
  pageSize?: number;
  sortBy?: TSortBy | `-${TSortBy}`;
};

export type NormalizedPaginatedRequest<TSortBy extends string> = {
  page: number;
  pageSize: number;
  sortBy: TSortBy | `-${TSortBy}`;
};

export type PaginationInfo = {
  page: number;
  pageSize: number;
  totalItems: number;
  hasNextPage: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: PaginationInfo;
};
