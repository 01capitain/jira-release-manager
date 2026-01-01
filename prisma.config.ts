import "dotenv/config";
import { defineConfig } from "prisma/config";
import { DEFAULT_DATABASE_URL } from "./src/config/database";

const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
if (!process.env.DATABASE_URL) {
  console.warn(
    "DATABASE_URL not set; using default development connection for Prisma CLI tasks.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
