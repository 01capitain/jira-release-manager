"use strict";

import { execFile } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = process.cwd();
const SCRIPT_PATH = path.join(PROJECT_ROOT, "scripts", "entity-expose.mjs");

const createOutputPath = () => {
  const dir = mkdtempSync(path.join(tmpdir(), "entity-expose-"));
  return path.join(dir, "report.json");
};

describe("entity-expose scaffolder", () => {
  it("produces a dry-run report with all expected files", async () => {
    const outputPath = createOutputPath();
    const entityName = "demo-widget";
    await execFileAsync(
      "node",
      [SCRIPT_PATH, entityName, "--dry-run", "--json"],
      {
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          ENTITY_EXPOSE_OUTPUT: outputPath,
        },
      },
    );
    const serialized = await readFile(outputPath, "utf8");
    const report = JSON.parse(serialized);
    expect(report).toMatchObject({
      entity: entityName,
      kebab: entityName,
      pascal: "DemoWidget",
    });

    const expectedPaths = [
      "src/shared/types/demo-widget.ts",
      "src/server/zod/dto/demo-widget.dto.ts",
      "src/server/services/demo-widget.service.ts",
      "src/server/rest/controllers/demo-widget.controller.ts",
      "tests/services/demo-widget.service.test.ts",
      "tests/e2e/demo-widget.rest.e2e.test.ts",
    ];

    type ReportAction = {
      relativePath: string;
      skipped: boolean;
      reason?: string;
    };
    const actions = report.actions as ReportAction[];

    for (const relative of expectedPaths) {
      const match = actions.find((action) => action.relativePath === relative);
      expect(match).toBeDefined();
      expect(match?.skipped).toBe(true);
      expect(match?.reason).toBe("dry-run");
    }
  });

  it("aborts when called without an entity name", async () => {
    const outputPath = createOutputPath();
    await expect(
      execFileAsync("node", [SCRIPT_PATH], {
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          ENTITY_EXPOSE_OUTPUT: outputPath,
        },
      }),
    ).rejects.toThrow();
  });
});
