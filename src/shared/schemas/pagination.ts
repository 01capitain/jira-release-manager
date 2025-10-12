import { z } from "zod";

import type {
  NormalizedPaginatedRequest,
  PaginatedRequest,
  PaginationInfo,
} from "~/shared/types/pagination";

const positiveInt = z.coerce.number().int().min(1);

export function createPaginatedRequestSchema<TSortBy extends string>(
  sortFields: readonly TSortBy[],
  options?: {
    defaultPage?: number;
    defaultPageSize?: number;
    defaultSortBy?: TSortBy | `-${TSortBy}`;
    maxPageSize?: number;
    descriptions?: {
      page?: string;
      pageSize?: string;
      sortBy?: string;
    };
  },
) {
  if (sortFields.length === 0) {
    throw new Error(
      "createPaginatedRequestSchema requires at least one sort field",
    );
  }

  const allowedSorts = new Set<string>([
    ...sortFields,
    ...sortFields.map((field) => `-${field}`),
  ]);

  const defaultSort =
    options?.defaultSortBy ?? (sortFields[0] as TSortBy | `-${TSortBy}`);
  if (!allowedSorts.has(defaultSort)) {
    throw new Error(
      `Default sort "${defaultSort}" is not part of the allowed sort fields`,
    );
  }

  const defaultPage = options?.defaultPage ?? 1;
  const defaultPageSize = options?.defaultPageSize ?? 10;
  const maxPageSize = options?.maxPageSize ?? 20;
  const descriptions = options?.descriptions ?? {};

  /**
   * Creates a Zod schema for paginated requests.
   *
   * @remarks
   * - Final pageSize is clamped to maxPageSize
   */
  return z
    .object({
      page: positiveInt
        .optional()
        .describe(descriptions.page ?? "Requested Page number"),
      pageSize: positiveInt
        .optional()
        .describe(descriptions.pageSize ?? "Number of items per page"),
      sortBy: z
        .string()
        .default(defaultSort)
        .refine((v) => allowedSorts.has(v), {
          message: `sortBy must be one of: ${Array.from(allowedSorts).join(", ")}`,
        })
        .describe(
          descriptions.sortBy ??
            `Sort field. Use "-" prefix for descending order. Allowed values: ${Array.from(allowedSorts).join(", ")}`,
        ),
    })
    .transform((value): NormalizedPaginatedRequest<TSortBy> => {
      const rawPageSize = value.pageSize ?? defaultPageSize;
      const pageSize = Math.min(rawPageSize, maxPageSize);
      return {
        page: value.page ?? defaultPage,
        pageSize,
        sortBy: value.sortBy as TSortBy | `-${TSortBy}`,
      };
    });
}

export const PaginationInfoSchema: z.ZodType<PaginationInfo> = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  hasNextPage: z.boolean(),
});

export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  z.object({
    data: z.array(itemSchema),
    pagination: PaginationInfoSchema,
  });

export type PaginatedRequestInput<TSortBy extends string> =
  PaginatedRequest<TSortBy>;
