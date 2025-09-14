import { z } from "zod";

// Branded ISO 8601 UTC timestamp string ending with 'Z'.
// Template literal narrows the general string type (not fully precise, but helpful):
export type ISO8601 =
  `${number}-${number}-${number}T${number}:${number}:${number}${"" | `.${number}`}Z` & {
    readonly __brand: "ISO8601";
  };

// Strict UTC (Z) format: YYYY-MM-DDTHH:mm:ss(.sss)?Z
const ISO_UTC_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z$/;

export const IsoTimestampSchema = z
  .string()
  .refine((v) => ISO_UTC_REGEX.test(v), {
    message: "Expected ISO 8601 UTC format e.g. 2025-01-01T12:34:56.000Z",
  })
  .transform((v) => v as ISO8601);
