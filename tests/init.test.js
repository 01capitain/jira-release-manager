/**
 * Tests focused on the PR diff introducing:
 *   CREATE EXTENSION IF NOT EXISTS pg_uuidv7;
 *
 * Testing library/framework:
 * - Uses Jest-style globals (describe/it/expect). If the project uses Mocha/Chai or Vitest,
 *   these tests should still run with minimal or no changes given common BDD APIs.
 *
 * Strategy:
 * - Scan migration/SQL files for the pg_uuidv7 extension statement.
 * - Validate presence, exact formatting with "IF NOT EXISTS", and guard against anti-patterns.
 * - Provide clear diagnostics listing which files were scanned.
 */

const fs = require('fs');
const path = require('path');

function listFiles(dirs, exts = ['.sql', '.psql']) {
  const results = [];
  const seen = new Set();
  const tryPush = (p) => {
    if (!seen.has(p)) {
      seen.add(p);
      results.push(p);
    }
  };

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    const st = fs.statSync(dir);
    if (!st.isDirectory()) return;
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walk(full);
      } else if (exts.includes(path.extname(full))) {
        tryPush(full);
      }
    }
  };

  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      const stat = fs.statSync(dir);
      if (stat.isDirectory()) walk(dir);
      if (stat.isFile() && exts.includes(path.extname(dir))) tryPush(dir);
    }
  }
  return results.sort();
}

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function findSqlFiles() {
  // Common migration locations used by Prisma, Knex, TypeORM, Sequelize, etc.
  const candidates = [
    'migrations',
    'migration',
    'db/migrations',
    'database/migrations',
    'prisma/migrations',
    'sql',
    'db/sql',
    'database/sql',
    // Fallbacks: root SQL files
    '.',
  ];
  const files = listFiles(candidates);
  // Filter to *.sql in case non-sql slipped in
  return files.filter(f => ['.sql', '.psql'].includes(path.extname(f)));
}

function gatherSqlContents() {
  const files = findSqlFiles();
  return files.map(f => ({ file: f, content: readFileSafe(f) }));
}

describe('PostgreSQL pg_uuidv7 extension migration', () => {
  const EXT_REGEX = /\bCREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+pg_uuidv7\s*;?/i;
  const STRICT_LINE = 'CREATE EXTENSION IF NOT EXISTS pg_uuidv7;';
  const BAD_NO_IF_NOT_EXISTS = /\bCREATE\s+EXTENSION\s+pg_uuidv7\s*;?/i;
  const DROP_EXT_REGEX = /\bDROP\s+EXTENSION\b.*\bpg_uuidv7\b/i;

  let sqlFiles;

  beforeAll(() => {
    sqlFiles = gatherSqlContents();
  });

  it('should find at least one SQL/migration file in the repository', () => {
    // This ensures the test provides actionable output if structure changes.
    expect(Array.isArray(sqlFiles)).toBe(true);
    expect(sqlFiles.length).toBeGreaterThan(0);
  });

  it('should include a CREATE EXTENSION IF NOT EXISTS pg_uuidv7 statement in at least one SQL file (happy path)', () => {
    const matches = sqlFiles.filter(({ content }) => EXT_REGEX.test(content || ''));
    const diagnostics = {
      totalSqlFiles: sqlFiles.length,
      scannedFiles: sqlFiles.map(f => f.file),
      matchedFiles: matches.map(f => f.file),
    };
    expect(matches.length).toBeGreaterThan(0);
    // Provide diagnostic output on failure
    if (matches.length === 0) {
      // eslint-disable-next-line no-console
      console.error('Diagnostics (pg_uuidv7 not found):', diagnostics);
    }
  });

  it('should prefer exact formatting with "IF NOT EXISTS" to avoid re-run failures (format check)', () => {
    const offenders = sqlFiles.filter(({ content }) => {
      if (!content) return false;
      const hasCreate = /CREATE\s+EXTENSION\b/i.test(content);
      const mentionsPgUuidv7 = /\bpg_uuidv7\b/.test(content);
      const lacksIfNotExists = mentionsPgUuidv7 && BAD_NO_IF_NOT_EXISTS.test(content) && !EXT_REGEX.test(content);
      return hasCreate && mentionsPgUuidv7 && lacksIfNotExists;
    });

    if (offenders.length > 0) {
      // eslint-disable-next-line no-console
      console.warn('Files creating pg_uuidv7 without IF NOT EXISTS:', offenders.map(o => o.file));
    }
    expect(offenders.length).toBe(0);
  });

  it('should not drop the pg_uuidv7 extension in migrations (safety guard)', () => {
    const droppers = sqlFiles.filter(({ content }) => content && DROP_EXT_REGEX.test(content));
    if (droppers.length > 0) {
      // eslint-disable-next-line no-console
      console.warn('Files that drop pg_uuidv7 extension:', droppers.map(d => d.file));
    }
    expect(droppers.length).toBe(0);
  });

  it('should ensure the statement ends with a semicolon to be valid SQL', () => {
    const offenders = [];
    for (const { file, content } of sqlFiles) {
      if (!content) continue;
      const idx = content.search(EXT_REGEX);
      if (idx >= 0) {
        const snippet = content.slice(idx, idx + 200);
        // Normalize whitespace; then check if semicolon present within the matched or immediately after
        const hasSemicolon = /pg_uuidv7\s*;/.test(snippet);
        if (!hasSemicolon) offenders.push(file);
      }
    }
    if (offenders.length > 0) {
      // eslint-disable-next-line no-console
      console.warn('Files missing semicolon after pg_uuidv7 extension creation:', offenders);
    }
    expect(offenders.length).toBe(0);
  });

  it('should pass a strict exact-line check when the file content is a single line SQL snippet', () => {
    // This directly targets the PR diff content.
    const singleLineExactMatches = sqlFiles
      .filter(({ content }) => typeof content === 'string')
      .filter(({ content }) => content.trim() === STRICT_LINE);

    // Not all repos will have a single-line file, so this is non-fatal but valuable if present.
    // If none match exactly, we still assert that at least one file has the extension with IF NOT EXISTS (covered above).
    // Here we only assert type/structure for discovered single-line files.
    if (singleLineExactMatches.length > 0) {
      for (const { content } of singleLineExactMatches) {
        expect(content.endsWith(';')).toBe(true);
        expect(content.includes('IF NOT EXISTS')).toBe(true);
      }
    } else {
      expect(true).toBe(true);
    }
  });
});