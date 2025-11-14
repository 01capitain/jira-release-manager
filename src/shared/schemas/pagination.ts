import { z } from "zod";

import type {
  NormalizedPaginatedRequest,
  PaginatedRequest,
  PaginationInfo,
} from "~/shared/types/pagination";
import type { AppSchemaMeta } from "~/shared/zod/registry";

const INTEGER_MESSAGE = "Expected integer value";

type SortParamSchema = z.ZodType<string>;

const createIntegerSchema = (min: number, options?: { coerce?: boolean }) => {
  const base = options?.coerce ? z.coerce.number() : z.number();
  return base
    .min(min)
    .refine(Number.isInteger, { error: INTEGER_MESSAGE })
    .meta({ type: "integer" });
};

const positiveIntegerInput = createIntegerSchema(1, { coerce: true });
const positiveIntegerOutput = createIntegerSchema(1);
const nonNegativeIntegerOutput = createIntegerSchema(0);

const createIntegerDocSchema = (min: number) =>
  z
    .number()
    .min(min)
    .refine(Number.isInteger, { error: INTEGER_MESSAGE })
    .meta({ type: "integer" });

const defaultDescriptions = {
  page: "Requested page number",
  pageSize: "Number of items per page",
  sortBy: 'Sort field. Use "-" prefix for descending order.',
} as const;

const PAGINATED_RESPONSE_META: AppSchemaMeta = {
  id: "PaginatedResponse",
  title: "Paginated Response",
  description:
    "Standard paginated response envelope containing result items and pagination details.",
};

type PaginatedDescriptions = {
  page?: string;
  pageSize?: string;
  sortBy?: string;
};

export function createPaginatedRequestSchema<TSortBy extends string>(
  sortFields: readonly TSortBy[],
  options?: {
    defaultPage?: number;
    defaultPageSize?: number;
    defaultSortBy?: TSortBy | `-${TSortBy}`;
    maxPageSize?: number;
    descriptions?: PaginatedDescriptions;
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
      page: positiveIntegerInput
        .optional()
        .describe(descriptions.page ?? defaultDescriptions.page)
        .default(defaultPage),
      pageSize: positiveIntegerInput
        .optional()
        .describe(descriptions.pageSize ?? defaultDescriptions.pageSize)
        .default(defaultPageSize),
      sortBy: z
        .enum(Array.from(allowedSorts))
        .default(defaultSort)
        .refine((v) => allowedSorts.has(v), {
          error: `sortBy must be one of: ${Array.from(allowedSorts).join(", ")}`,
        })
        .describe(descriptions.sortBy ?? defaultDescriptions.sortBy),
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

export const PaginationInfoSchema: z.ZodType<PaginationInfo> = z
  .object({
    page: positiveIntegerOutput,
    pageSize: positiveIntegerOutput,
    totalItems: nonNegativeIntegerOutput,
    hasNextPage: z.boolean(),
  })
  .meta({
    id: "PaginationInfo",
    title: "Pagination Info",
    description: "Normalized pagination metadata.",
  });

export const PaginatedResponseEnvelopeSchema = z
  .object({
    data: z.array(z.unknown()),
    pagination: PaginationInfoSchema,
  })
  .meta(PAGINATED_RESPONSE_META);

export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  PaginatedResponseEnvelopeSchema.extend({
    data: z.array(itemSchema),
  });

export const createPaginatedQueryDocSchema = (
  sortEnum: SortParamSchema,
  options?: { descriptions?: PaginatedDescriptions },
) => {
  const descriptions = options?.descriptions ?? {};
  return z
    .object({
      page: createIntegerDocSchema(1)
        .describe(descriptions.page ?? defaultDescriptions.page)
        .optional(),
      pageSize: createIntegerDocSchema(1)
        .describe(descriptions.pageSize ?? defaultDescriptions.pageSize)
        .optional(),
    })
    .extend({
      sortBy: sortEnum
        .describe(descriptions.sortBy ?? defaultDescriptions.sortBy)
        .optional(),
    });
};

export type PaginatedRequestInput<TSortBy extends string> =
  PaginatedRequest<TSortBy>;
