"use strict";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = process.cwd();
const SCRIPT_PATH = path.join(PROJECT_ROOT, "scripts", "entity-expose.mjs");

describe("entity-expose scaffolder", () => {
  it("produces a dry-run report with all expected files", async () => {
    const entityName = "demo-widget";
    const { stdout } = await execFileAsync("node", [
      SCRIPT_PATH,
      entityName,
      "--dry-run",
      "--json",
    ]);
    const report = JSON.parse(stdout);
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

    for (const relative of expectedPaths) {
      const match = report.actions.find(
        (action: { relativePath: string }) => action.relativePath === relative,
      );
      expect(match).toBeDefined();
      expect(match.skipped).toBe(true);
      expect(match.reason).toBe("dry-run");
    }
  });

  it("aborts when called without an entity name", async () => {
    await expect(
      execFileAsync("node", [SCRIPT_PATH], { cwd: PROJECT_ROOT }),
    ).rejects.toThrow(/entity name is required|Usage/);
  });
});
