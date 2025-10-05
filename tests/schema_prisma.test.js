/**
 * Prisma schema validation tests
 *
 * Test runner & library: Jest-style (describe/it/expect). Compatible with Vitest as well.
 * These tests validate structural invariants of the Prisma schema without hitting a database.
 *
 * Focus: Ensures the schema contains the expected models, fields, attributes, and indexes
 * as per the pull request changes, with emphasis on UUID v7 usage and NextAuth adapter models.
 */

const fs = require("fs");
const path = require("path");

// Helper: find schema.prisma in common locations or env override
function resolveSchemaPath() {
  const fromEnv = process.env.PRISMA_SCHEMA_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  const candidates = ["prisma/schema.prisma"].map((p) =>
    path.resolve(process.cwd(), p),
  );

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(
    "schema.prisma not found. Set PRISMA_SCHEMA_PATH env to the schema file.",
  );
}

function loadSchema() {
  const schemaPath = resolveSchemaPath();
  const text = fs.readFileSync(schemaPath, "utf8");
  return { schemaPath, text };
}

/**
 * @param {string} text
 * @param {string} blockType
 * @returns {string[]}
 */
function blockNames(text, blockType) {
  /** @type {string[]} */
  const names = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith(blockType)) {
      const parts = trimmedLine.split(" ");
      if (parts.length > 1 && parts[1]) {
        names.push(parts[1]);
      }
    }
  }
  return names;
}

/**
 * @param {string} text
 * @param {string} blockType
 * @param {string} name
 * @returns {string | null}
 */
function getBlock(text, blockType, name) {
  const lines = text.split("\n");
  let inBlock = false;
  let block = "";
  let depth = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith(`${blockType} ${name}`)) {
      inBlock = true;
    }

    if (inBlock) {
      block += line + "\n";
      if (line.includes("{")) {
        depth++;
      }
      if (line.includes("}")) {
        depth--;
        if (depth === 0) {
          inBlock = false;
          return block;
        }
      }
    }
  }
  return null;
}

describe("Prisma schema structure", () => {
  /** @type {string} */
  let schemaText = "";

  beforeAll(() => {
    const { text } = loadSchema();
    schemaText = text;
  });

  it('contains exactly one generator client with provider "prisma-client-js"', () => {
    const gens = blockNames(schemaText, "generator");
    // Multiple "generator client" blocks would be invalid
    const clientCount = gens.filter((n) => n === "client").length;
    expect(clientCount).toBe(1);

    const block = getBlock(schemaText, "generator", "client");
    expect(block).toBeTruthy();
    if (block) {
      expect(block).toMatch(/provider\s*=\s*"prisma-client-js"/);
    }
  });

  it("defines a PostgreSQL datasource with DATABASE_URL", () => {
    const dss = blockNames(schemaText, "datasource");
    expect(dss.length).toBeGreaterThanOrEqual(1);

    if (dss.length > 0 && dss[0]) {
      // Find the first datasource block and validate key expectations
      const dsBlock = getBlock(schemaText, "datasource", dss[0]);
      expect(dsBlock).toBeTruthy();
      if (dsBlock) {
        expect(dsBlock).toMatch(/provider\s*=\s*"postgresql"/);
        expect(dsBlock).toMatch(/url\s*=\s*env\("DATABASE_URL"\)/);
        expect(dsBlock).not.toMatch(/extensions\s*=/);
      }
    }
  });

  it("includes NextAuth models: Account, Session, User, VerificationToken with expected keys and constraints", () => {
    const account = getBlock(schemaText, "model", "Account");
    const session = getBlock(schemaText, "model", "Session");
    const user = getBlock(schemaText, "model", "User");
    const vt = getBlock(schemaText, "model", "VerificationToken");

    expect(account).toBeTruthy();
    expect(session).toBeTruthy();
    expect(user).toBeTruthy();
    expect(vt).toBeTruthy();

    if (account) {
      // Account basics
      expect(account.replace(/\s+/g, " ")).toMatch(
        /id\s+String\s+@id\s+@default\(dbgenerated\(\"uuidv7\(\)\"\)\)\s+@db.Uuid/,
      );
      expect(account).toMatch(/@@unique\(\[provider,\s*providerAccountId\]\)/);
      expect(account).toMatch(/@@index\(\[userId\]\)/);
      expect(account.replace(/\s+/g, " ")).toMatch(
        /user\s+User\s+@relation\(fields:\s*\[userId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/,
      );
    }

    if (session) {
      // Session basics
      expect(session.replace(/\s+/g, " ")).toMatch(
        /id\s+String\s+@id\s+@default\(dbgenerated\(\"uuidv7\(\)\"\)\)\s+@db.Uuid/,
      );
      expect(session).toMatch(/sessionToken\s+String\s+@unique/);
      expect(session).toMatch(/@@index\(\[userId\]\)/);
    }

    if (user) {
      // User basics
      expect(user.replace(/\s+/g, " ")).toMatch(
        /id\s+String\s+@id\s+@default\(dbgenerated\(\"uuidv7\(\)\"\)\)\s+@db.Uuid/,
      );
      expect(user).toMatch(/email\s+String\?\s+@unique/);
    }

    if (vt) {
      // VerificationToken basics
      expect(vt).toMatch(/@@unique\(\[identifier,\s*token\]\)/);
      expect(vt).toMatch(/token\s+String\s+@unique/);
    }
  });

  it("does not declare duplicate generator client blocks (guard against accidental nesting/duplication)", () => {
    const gens = blockNames(schemaText, "generator");
    const clientCount = gens.filter((n) => n === "client").length;
    expect(clientCount).toBe(1);
    // Also assert that a generator block is not nested within another
    const clientBlock = getBlock(schemaText, "generator", "client");
    expect(clientBlock).toBeTruthy();
    if (clientBlock) {
      const lines = clientBlock.split("\n").slice(1).join("\n");
      // A simple heuristic: client block should not contain another "generator client {"
      expect(lines).not.toContain("generator client {");
    }
  });

  it("uses UUID columns for all id fields across models (String @db.Uuid)", () => {
    const models = blockNames(schemaText, "model");
    for (const m of models) {
      const block = getBlock(schemaText, "model", m);
      // Skip models that may not have id by design
      if (!block) continue;
      if (/^@@id/m.test(block)) continue;
      // If an 'id' field exists, ensure it's String @db.Uuid
      if (/^id\s+/m.test(block)) {
        expect(block.replace(/\s+/g, " ")).toMatch(
          /id\s+String\s+@id\b.*@db.Uuid/,
        );
      }
    }
  });

  it("keeps provider hints for mysql/sqlserver only in comments (no actual mysql/sqlserver provider)", () => {
    // The schema may include comments mentioning mysql/sqlserver; ensure provider isn't set to those
    const dsBlocks = blockNames(schemaText, "datasource").map(
      (n) => getBlock(schemaText, "datasource", n) || "",
    );
    for (const b of dsBlocks) {
      expect(b).not.toMatch(/provider\s*=\s*"(mysql|sqlserver)"/);
    }
  });
});
