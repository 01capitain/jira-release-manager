import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDocument } from "zod-openapi";
import YAML from "yaml";

import { actionHistoryPaths } from "../src/server/rest/controllers/action-history.controller.ts";
import { builtVersionPaths } from "../src/server/rest/controllers/built-version-transitions.controller.ts";
import { releaseComponentPaths } from "../src/server/rest/controllers/release-components.controller.ts";
import { releaseVersionPaths } from "../src/server/rest/controllers/release-versions.controller.ts";
import { userPaths } from "../src/server/rest/controllers/users.controller.ts";

const isCheck = process.argv.includes("--check");

const fileUrl = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(fileUrl), "..");
const outputPath = path.join(rootDir, "docs", "api", "openapi.yaml");

const paths = {
  ...releaseVersionPaths,
  ...releaseComponentPaths,
  ...builtVersionPaths,
  ...actionHistoryPaths,
  ...userPaths,
};


async function main() {
  const document = createDocument({
    openapi: "3.1.0",
    info: {
      title: "Jira Release Manager REST API",
      version: "1.0.0",
      description:
        "Generated specification for the versioned REST endpoints exposed under /api/v1.",
    },
    servers: [{ url: "/api/v1", description: "Application server" }],
    paths,
  });

  const yaml = YAML.stringify(document, { simpleKeys: false });
  const normalized = yaml.endsWith("\n") ? yaml : `${yaml}\n`;

  if (isCheck) {
    try {
      const existing = await readFile(outputPath, "utf8");
      if (existing !== normalized) {
        console.error("OpenAPI spec is out of date. Run pnpm openapi:gen.");
        process.exit(1);
      }
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.error("OpenAPI spec has not been generated yet. Run pnpm openapi:gen.");
        process.exit(1);
      }
      throw error;
    }
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, normalized, "utf8");

  console.log(`OpenAPI spec written to ${path.relative(rootDir, outputPath)}`);
}

main().catch((error) => {
  console.error("Failed to generate OpenAPI spec:");
  console.error(error);
  process.exit(1);
});
