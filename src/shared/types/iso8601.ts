import { z } from "zod";

const ISO_UTC_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z$/;

export const IsoTimestampSchema = z
  .string()
  .regex(ISO_UTC_REGEX, {
    error: "Expected ISO 8601 UTC format e.g. 2025-01-01T12:34:56.000Z",
  })
  .brand<"ISO8601">()
  .meta({
    id: "iso8601Timestamp",
    title: "ISO 8601 Timestamp",
    description: "UTC timestamp string ending with 'Z'.",
    examples: ["2025-01-01T12:34:56.000Z"],
  });

export type ISO8601 = z.infer<typeof IsoTimestampSchema>;
