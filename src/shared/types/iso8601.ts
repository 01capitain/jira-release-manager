import { z } from "zod";

// ISO 8601 UTC timestamp string ending with 'Z'.
// Strict UTC (Z) format: YYYY-MM-DDTHH:mm:ss(.sss)?Z
const ISO_UTC_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z$/;

export const IsoTimestampSchema = z
  .string()
  .regex(ISO_UTC_REGEX, {
    message: "Expected ISO 8601 UTC format e.g. 2025-01-01T12:34:56.000Z",
  })
  .brand<"ISO8601">();

export type ISO8601 = z.infer<typeof IsoTimestampSchema>;
