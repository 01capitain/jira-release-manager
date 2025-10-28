import { z } from "zod";

const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type UuidV7 = string & z.BRAND<"UuidV7">;

export const UuidV7Schema = z
  .string()
  .regex(UUID_V7_REGEX, {
    error:
      "Expected UUIDv7 string (e.g., 018f0b4e-5ff9-7000-8000-000000000000)",
  })
  .brand<"UuidV7">()
  .meta({
    id: "uuidv7",
    title: "UUIDv7",
    description: "Universally unique identifier (version 7).",
    examples: ["018f0b4e-5ff9-7000-8000-000000000000"],
  });
