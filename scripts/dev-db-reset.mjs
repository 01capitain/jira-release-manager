#!/usr/bin/env node
import { execSync } from "node:child_process";

const env = process.env.NODE_ENV ?? "";
if (env !== "development") {
  console.error(
    `Refusing to reset DB: NODE_ENV is '${env || "(unset)"}'. Set NODE_ENV=development to run db:reset.\n` +
      "Examples:\n" +
      "- bash/zsh:   NODE_ENV=development pnpm db:reset\n" +
      "- PowerShell: $env:NODE_ENV='development'; pnpm db:reset\n" +
      "- cmd.exe:    set NODE_ENV=development && pnpm db:reset",
  );
  process.exit(1);
}

function run(cmd) {
  console.log(`→ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

try {
  // Drop and recreate schemas from current Prisma schema
  run("pnpm exec prisma db push --force-reset");
  // Ensure required extensions are present
  run("pnpm run db:init");
  // Final push as a no-op sanity step
  run("pnpm exec prisma db push");
  console.log("✔ Database reset complete (development only)");
} catch (err) {
  console.error("✖ Database reset failed");
  process.exit(1);
}
