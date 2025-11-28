#!/usr/bin/env node

/**
 * Entity exposure scaffolder.
 *
 * Usage:
 *   pnpm entity:expose release-version
 *   pnpm entity:expose release-version --dry-run
 *
 * The script creates starter files for a REST-exposed entity:
 * - Shared DTO type
 * - Zod DTO schema (with ID helper and mapping utilities)
 * - Service skeleton
 * - REST controller skeleton
 * - Service unit test + REST e2e test stubs
 *
 * By default the script writes files to disk without overwriting existing ones.
 * Pass --force to overwrite individual files.
 * Pass --dry-run to preview actions without writing.
 *
 * The main generator is exported for testing.
 */

import { constants } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const DEFAULT_SORT_FIELD = "createdAt";

const ensureDir = async (dirPath) => {
  await mkdir(dirPath, { recursive: true });
};

const exists = async (filePath) => {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const writeIfAllowed = async (filePath, content, options) => {
  const alreadyExists = await exists(filePath);
  if (alreadyExists && !options.force) {
    return { filePath, skipped: true, reason: "exists" };
  }
  if (options.dryRun) {
    return {
      filePath,
      skipped: true,
      reason: options.force ? "dry-run-force" : "dry-run",
    };
  }
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, "utf8");
  return { filePath, skipped: false };
};

const toWords = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\s-]+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean);

const toPascalCase = (value) =>
  toWords(value)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

const toCamelCase = (value) => {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const toKebabCase = (value) => toWords(value).join("-");

const toConstantCase = (value) => toWords(value).join("_").toUpperCase();

const pluralise = (value) => {
  if (value.endsWith("s")) {
    return `${value}es`;
  }
  if (value.endsWith("y")) {
    const beforeY = value.charAt(value.length - 2);
    if (beforeY && !/[aeiou]/i.test(beforeY)) {
      return `${value.slice(0, -1)}ies`;
    }
  }
  return `${value}s`;
};

const sharedTypeTemplate = ({ pascal }) => `import type { ISO8601 } from "~/shared/types/iso8601";
import type { UuidV7 } from "~/shared/types/uuid";

/**
 * TODO: Refine ${pascal}Dto to match the public shape you want to expose.
 * Add, remove, or adjust fields before shipping the endpoint.
 */
export type ${pascal}Dto = {
  id: UuidV7;
  createdAt: ISO8601;
  // name: string;
};
`;

const zodDtoTemplate = ({
  pascal,
  kebab,
}) => `import { ${pascal}ModelSchema } from "~/server/zod/schemas/variants/pure/${pascal}.pure";
import type { ${pascal}Dto } from "~/shared/types/${kebab}";
import { IsoTimestampSchema } from "~/shared/types/iso8601";
import { UuidV7Schema } from "~/shared/types/uuid";

/**
 * TODO: extend the picked fields to match the DTO shape.
 * Keep server-only columns (e.g., updatedAt) out of the public contract.
 */
const ${pascal}ModelFieldsSchema = ${pascal}ModelSchema.pick({
  id: true,
  createdAt: true,
  // name: true,
}).strip();

export const ${pascal}DtoSchema = ${pascal}ModelFieldsSchema.omit({
  id: true,
  createdAt: true,
})
  .extend({
    id: UuidV7Schema,
    createdAt: IsoTimestampSchema,
  })
  .meta({
    id: "${pascal}",
    title: "${pascal}",
    description: "${pascal} DTO.",
  });

export const ${pascal}IdSchema = ${pascal}DtoSchema.shape.id;

export function to${pascal}Dto(model: unknown): ${pascal}Dto {
  const parsed = ${pascal}ModelSchema.pick({
    id: true,
    createdAt: true,
    // name: true,
  })
    .strip()
    .parse(model);

  const dto: ${pascal}Dto = {
    id: parsed.id,
    createdAt: parsed.createdAt.toISOString() as ${pascal}Dto["createdAt"],
    // name: parsed.name,
  };

  return ${pascal}DtoSchema.strip().parse(dto);
}

export function mapTo${pascal}Dtos(models: unknown[]): ${pascal}Dto[] {
  return models.map((model) => to${pascal}Dto(model));
}
`;

const serviceTemplate = ({
  pascal,
  camel,
  kebab,
}) => `import type { PrismaClient } from "@prisma/client";

import type { ${pascal}Dto } from "~/shared/types/${kebab}";
import { mapTo${pascal}Dtos, to${pascal}Dto } from "~/server/zod/dto/${kebab}.dto";

/**
 * Service responsible for ${pascal} domain logic.
 * Replace the TODO sections once you know which data you need.
 */
export class ${pascal}Service {
  constructor(private readonly db: PrismaClient) {}

  async list(): Promise<${pascal}Dto[]> {
    const rows = await this.db.${camel}.findMany({
      take: 10,
      // TODO: add filtering, ordering, selects...
    });
    return mapTo${pascal}Dtos(rows);
  }

  async getById(${camel}Id: string): Promise<${pascal}Dto> {
    const row = await this.db.${camel}.findUniqueOrThrow({
      where: { id: ${camel}Id },
      // TODO: include relations if required.
    });
    return to${pascal}Dto(row);
  }
}
`;

const controllerTemplate = ({
  pascal,
  camel,
  kebab,
  constant,
}) => `import { z } from "zod";

import { ${pascal}Service } from "~/server/services/${kebab}.service";
import {
  ${pascal}DtoSchema,
  ${pascal}IdSchema,
  mapTo${pascal}Dtos,
} from "~/server/zod/dto/${kebab}.dto";
import type { RestContext } from "~/server/rest/context";
import { ensureAuthenticated } from "~/server/rest/auth";
import { jsonErrorResponse } from "~/server/rest/openapi";
import {
  createPaginatedQueryDocSchema,
  createPaginatedRequestSchema,
  createPaginatedResponseSchema,
} from "~/shared/schemas/pagination";

const ${constant}_SORT_FIELDS = ["${DEFAULT_SORT_FIELD}"] as const;

export const ${pascal}ListQuerySchema = createPaginatedRequestSchema(
  ${constant}_SORT_FIELDS,
);

export type ${pascal}ListQuery = z.infer<typeof ${pascal}ListQuerySchema>;

export const ${pascal}ListQueryDocSchema = createPaginatedQueryDocSchema(
  z.enum([...${constant}_SORT_FIELDS]),
);

export const ${pascal}ListResponseSchema = createPaginatedResponseSchema(
  ${pascal}DtoSchema,
).meta({
  id: "${pascal}ListResponse",
  title: "${pascal} List Response",
  description: "Paginated ${camel} list response.",
});

export const ${pascal}DetailSchema = ${pascal}DtoSchema;

export const ${pascal}IdParamSchema = z.object({
  ${camel}Id: ${pascal}IdSchema,
});

export const list${pascal}s = async (
  context: RestContext,
  query: ${pascal}ListQuery,
) => {
  ensureAuthenticated(context);
  const service = new ${pascal}Service(context.db);
  // TODO: pass pagination (query.page, query.pageSize, etc.) through to the service.
  return service.list();
};

export const get${pascal} = async (
  context: RestContext,
  ${camel}Id: string,
) => {
  ensureAuthenticated(context);
  const service = new ${pascal}Service(context.db);
  return service.getById(${camel}Id);
};

export const ${camel}Paths = {
  "/${pluralise(kebab)}": {
    get: {
      operationId: "list${pascal}s",
      summary: "List ${camel}s",
      tags: ["${pascal}"],
      requestParams: {
        query: ${pascal}ListQueryDocSchema,
      },
      responses: {
        200: {
          description: "${pascal} list",
          content: {
            "application/json": {
              schema: ${pascal}ListResponseSchema,
            },
          },
        },
        401: jsonErrorResponse("Authentication required"),
      },
    },
  },
  "/${pluralise(kebab)}/{${camel}Id}": {
    get: {
      operationId: "get${pascal}",
      summary: "Get ${camel}",
      tags: ["${pascal}"],
      requestParams: {
        path: ${pascal}IdParamSchema,
      },
      responses: {
        200: {
          description: "${pascal} detail",
          content: {
            "application/json": {
              schema: ${pascal}DetailSchema,
            },
          },
        },
        401: jsonErrorResponse("Authentication required"),
        404: jsonErrorResponse("${pascal} not found"),
      },
    },
  },
} as const;

/**
 * TODO: Register \`${camel}Paths\` in \`scripts/generate-openapi.ts\`
 * and add route handlers to the Next.js REST router.
 */
`;

const serviceTestTemplate = ({
  pascal,
  kebab,
  camel,
}) => `import { ${pascal}Service } from "~/server/services/${kebab}.service";

describe("${pascal}Service", () => {
  it("list returns DTOs (placeholder)", async () => {
    const db: any = {
      ${camel}: {
        findMany: jest.fn(async () => [
          { id: "018f1a50-0000-7000-9000-0000000000aa", createdAt: new Date() },
        ]),
      },
    };
    const service = new ${pascal}Service(db);
    const result = await service.list();
    expect(result).toHaveLength(1);
  });
});
`;

const e2eTestTemplate = ({
  pascal,
  camel,
  kebab,
}) => `import { NextRequest } from "next/server";

import { list${pascal}s } from "~/server/rest/controllers/${kebab}.controller";

describe("${pascal} REST controller", () => {
  it("list handler authenticates (placeholder)", async () => {
    const context: any = {
      db: {
        ${camel}: {
          findMany: jest.fn(async () => []),
        },
      },
      sessionToken: null,
      request: new Request("http://test"),
    };
    await expect(
      list${pascal}s(context, { page: 1, pageSize: 10, sortBy: "${DEFAULT_SORT_FIELD}" }),
    ).rejects.toThrow();
  });
});
`;

const templates = [
  {
    relativePath: (kebab) => path.join("src", "shared", "types", `${kebab}.ts`),
    build: sharedTypeTemplate,
    category: "shared-dto",
  },
  {
    relativePath: (kebab) =>
      path.join("src", "server", "zod", "dto", `${kebab}.dto.ts`),
    build: zodDtoTemplate,
    category: "zod-dto",
  },
  {
    relativePath: (kebab) =>
      path.join("src", "server", "services", `${kebab}.service.ts`),
    build: serviceTemplate,
    category: "service",
  },
  {
    relativePath: (kebab) =>
      path.join(
        "src",
        "server",
        "rest",
        "controllers",
        `${kebab}.controller.ts`,
      ),
    build: controllerTemplate,
    category: "controller",
  },
  {
    relativePath: (kebab) =>
      path.join("tests", "services", `${kebab}.service.test.ts`),
    build: serviceTestTemplate,
    category: "service-test",
  },
  {
    relativePath: (kebab) =>
      path.join("tests", "e2e", `${kebab}.rest.e2e.test.ts`),
    build: e2eTestTemplate,
    category: "e2e-test",
  },
];

export async function generateEntity(entityName, options = {}) {
  if (!entityName || typeof entityName !== "string") {
    throw new Error("entity name is required");
  }
  const kebab = toKebabCase(entityName);
  const pascal = toPascalCase(entityName);
  const camel = toCamelCase(entityName);
  const constant = toConstantCase(entityName);

  const context = { pascal, camel, kebab, constant };
  const actions = [];

  for (const template of templates) {
    const relative = template.relativePath(kebab);
    const target = path.join(ROOT, relative);
    const content = template.build(context);
    const result = await writeIfAllowed(target, content, options);
    actions.push({
      ...result,
      relativePath: relative,
      category: template.category,
    });
  }

  return { entity: entityName, kebab, pascal, camel, actions };
}

const parseFlags = (argv) => {
  const flags = { force: false, dryRun: false, json: false };
  const names = [];
  for (const arg of argv) {
    if (arg === "--force") flags.force = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--json") flags.json = true;
    else if (arg.startsWith("-")) throw new Error(`Unknown flag: ${arg}`);
    else names.push(arg);
  }
  return { flags, names };
};

if (process.argv[1] === __filename) {
  const [, , ...rest] = process.argv;
  const { flags, names } = parseFlags(rest);
  const [entityName] = names;
  if (!entityName) {
    console.error(
      "Usage: pnpm entity:expose <entity-name> [--dry-run] [--force] [--json]",
    );
    process.exit(1);
  }

  const run = async () => {
    const result = await generateEntity(entityName, flags);
    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log(`Scaffolded entity: ${result.pascal}`);
    for (const action of result.actions) {
      if (action.skipped) {
        const reason =
          action.reason === "exists"
            ? "already exists"
            : action.reason === "dry-run"
              ? "dry-run"
              : "skipped";
        console.log(`  - SKIP ${action.relativePath} (${reason})`);
      } else {
        console.log(`  - WRITE ${action.relativePath}`);
      }
    }
    if (!flags.dryRun) {
      console.log(
        "\nNext steps:\n  • Update field selections in the generated files.\n  • Register controller paths in scripts/generate-openapi.ts.\n  • Flesh out service logic and tests.",
      );
    }
  };

  process.stdin.resume();
  run()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    })
    .finally(() => {
      process.stdin.pause();
    });
}
