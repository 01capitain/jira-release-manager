/**
 * Prisma schema validation tests
 *
 * Test runner & library: Jest-style (describe/it/expect). Compatible with Vitest as well.
 * These tests validate structural invariants of the Prisma schema without hitting a database.
 *
 * Focus: Ensures the schema contains the expected models, fields, attributes, and indexes
 * as per the pull request changes, with emphasis on UUID v7 usage and NextAuth adapter models.
 */

const fs = require('fs');
const path = require('path');

// Helper: find schema.prisma in common locations or env override
function resolveSchemaPath() {
  const fromEnv = process.env.PRISMA_SCHEMA_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  const candidates = [
    'prisma/schema.prisma',
    'apps/web/prisma/schema.prisma',
    'packages/db/prisma/schema.prisma',
    'services/api/prisma/schema.prisma',
    'schema.prisma', // repo root fallback
  ].map(p => path.resolve(process.cwd(), p));

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  // As a last resort, do a shallow walk of top-level dirs for prisma/schema.prisma
  const top = fs.readdirSync(process.cwd(), { withFileTypes: true })
    .filter(d => d.isDirectory() && !['node_modules', '.git', 'dist', 'build', 'out'].includes(d.name))
    .map(d => d.name);

  for (const dir of top) {
    const candidate = path.resolve(process.cwd(), dir, 'prisma', 'schema.prisma');
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error('schema.prisma not found. Set PRISMA_SCHEMA_PATH env to the schema file.');
}

function loadSchema() {
  const schemaPath = resolveSchemaPath();
  const text = fs.readFileSync(schemaPath, 'utf8');
  return { schemaPath, text };
}

function blockNames(text, blockType) {
  // Rough parser: matches "model Name {", "generator name {", "datasource name {"
  const re = new RegExp(`^\\s*${blockType}\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*\\{`, 'gm');
  const names = [];
  let m;
  while ((m = re.exec(text))) names.push(m[1]);
  return names;
}

function getBlock(text, blockType, name) {
  const start = new RegExp(`^\\s*${blockType}\\s+${name}\\s*\\{`, 'm');
  const startMatch = text.match(start);
  if (!startMatch) return null;
  const startIdx = startMatch.index;
  // naive brace matching from startIdx
  let i = text.indexOf('{', startIdx);
  if (i === -1) return null;
  let depth = 1;
  let j = i + 1;
  while (j < text.length && depth > 0) {
    const ch = text[j];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    j++;
  }
  return text.slice(startIdx, j);
}

describe('Prisma schema structure', () => {
  let schemaText;

  beforeAll(() => {
    const { text } = loadSchema();
    schemaText = text;
  });

  it('contains exactly one generator client with provider "prisma-client-js"', () => {
    const gens = blockNames(schemaText, 'generator');
    // Multiple "generator client" blocks would be invalid
    const clientCount = gens.filter(n => n === 'client').length;
    expect(clientCount).toBe(1);

    const block = getBlock(schemaText, 'generator', 'client');
    expect(block).toBeTruthy();
    expect(block).toMatch(/provider\s*=\s*"prisma-client-js"/);
  });

  it('defines a PostgreSQL datasource with DATABASE_URL and pg_uuidv7 extension', () => {
    const dss = blockNames(schemaText, 'datasource');
    expect(dss.length).toBeGreaterThanOrEqual(1);

    // Find the first datasource block and validate key expectations
    const dsBlock = getBlock(schemaText, 'datasource', dss[0]);
    expect(dsBlock).toMatch(/provider\s*=\s*"postgresql"/);
    expect(dsBlock).toMatch(/url\s*=\s*env\("DATABASE_URL"\)/);
    // extension list includes pg_uuidv7
    expect(dsBlock.replace(/\s+/g, ' ')).toMatch(/extensions\s*=\s*\[[^\]]*pg_uuidv7[^\]]*\]/);
  });

  it('contains the Post model with proper UUID v7 id, timestamps, relations, and indexes', () => {
    const postBlock = getBlock(schemaText, 'model', 'Post');
    expect(postBlock).toBeTruthy();

    // id: String @id @default(dbgenerated("uuid_generate_v7()")) @db.Uuid
    expect(postBlock.replace(/\s+/g, ' ')).toMatch(/id\s+String\s+@id\s+@default\(dbgenerated\("uuid_generate_v7\(\)"\)\)\s+@db\.Uuid/);

    // name: String
    expect(postBlock).toMatch(/^\s*name\s+String\s*$/m);

    // createdAt default now()
    expect(postBlock.replace(/\s+/g, ' ')).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);

    // updatedAt @updatedAt
    expect(postBlock.replace(/\s+/g, ' ')).toMatch(/updatedAt\s+DateTime\s+@updatedAt/);

    // createdBy relation and createdById field with @db.Uuid
    expect(postBlock.replace(/\s+/g, ' ')).toMatch(/createdBy\s+User\s+@relation\(fields:\s*\[createdById\],\s*references:\s*\[id\]\)/);
    expect(postBlock.replace(/\s+/g, ' ')).toMatch(/createdById\s+String\s+@db\.Uuid/);

    // indexes on name and createdById
    expect(postBlock).toMatch(/@@index\(\[name\]\)/);
    expect(postBlock).toMatch(/@@index\(\[createdById\]\)/);
  });

  it('includes NextAuth models: Account, Session, User, VerificationToken with expected keys and constraints', () => {
    const account = getBlock(schemaText, 'model', 'Account');
    const session = getBlock(schemaText, 'model', 'Session');
    const user = getBlock(schemaText, 'model', 'User');
    const vt = getBlock(schemaText, 'model', 'VerificationToken');

    expect(account).toBeTruthy();
    expect(session).toBeTruthy();
    expect(user).toBeTruthy();
    expect(vt).toBeTruthy();

    // Account basics
    expect(account.replace(/\s+/g, ' ')).toMatch(/id\s+String\s+@id\s+@default\(dbgenerated\("uuid_generate_v7\(\)"\)\)\s+@db\.Uuid/);
    expect(account).toMatch(/@@unique\(\[provider,\s*providerAccountId\]\)/);
    expect(account).toMatch(/@@index\(\[userId\]\)/);
    expect(account.replace(/\s+/g, ' ')).toMatch(/user\s+User\s+@relation\(fields:\s*\[userId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/);

    // Session basics
    expect(session.replace(/\s+/g, ' ')).toMatch(/id\s+String\s+@id\s+@default\(dbgenerated\("uuid_generate_v7\(\)"\)\)\s+@db\.Uuid/);
    expect(session).toMatch(/sessionToken\s+String\s+@unique/);
    expect(session).toMatch(/@@index\(\[userId\]\)/);

    // User basics
    expect(user.replace(/\s+/g, ' ')).toMatch(/id\s+String\s+@id\s+@default\(dbgenerated\("uuid_generate_v7\(\)"\)\)\s+@db\.Uuid/);
    expect(user).toMatch(/email\s+String\?\s+@unique/);

    // VerificationToken basics
    expect(vt).toMatch(/@@unique\(\[identifier,\s*token\]\)/);
    expect(vt).toMatch(/token\s+String\s+@unique/);
  });

  it('does not declare duplicate generator client blocks (guard against accidental nesting/duplication)', () => {
    const gens = blockNames(schemaText, 'generator');
    const clientCount = gens.filter(n => n === 'client').length;
    expect(clientCount).toBe(1);
    // Also assert that a generator block is not nested within another
    const clientBlock = getBlock(schemaText, 'generator', 'client');
    // A simple heuristic: client block should not contain another "generator client {"
    expect(clientBlock).not.toMatch(/^\s*generator\s+client\s*\{/m);
  });

  it('uses UUID columns for all id fields across models (String @db.Uuid)', () => {
    const models = blockNames(schemaText, 'model');
    for (const m of models) {
      const block = getBlock(schemaText, 'model', m);
      // Skip models that may not have id by design
      if (!block) continue;
      if (/^\s*@@id/m.test(block)) continue;
      // If an 'id' field exists, ensure it's String @db.Uuid
      if (/^\s*id\s+/m.test(block)) {
        expect(block.replace(/\s+/g, ' ')).toMatch(/id\s+String\s+@id\b.*@db\.Uuid/);
      }
    }
  });

  it('keeps provider hints for mysql/sqlserver only in comments (no actual mysql/sqlserver provider)', () => {
    // The schema may include comments mentioning mysql/sqlserver; ensure provider isn't set to those
    const dsBlocks = blockNames(schemaText, 'datasource').map(n => getBlock(schemaText, 'datasource', n) || '');
    for (const b of dsBlocks) {
      expect(b).not.toMatch(/provider\s*=\s*"(mysql|sqlserver)"/);
    }
  });
});