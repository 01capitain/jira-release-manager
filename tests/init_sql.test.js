/*
Test framework detected: Jest
Purpose: Validate the SQL init statement for the pg_uuidv7 extension added in the PR diff.
Notes: Uses Jest globals (describe/test/expect) to remain compatible with common setups.
*/

const SQL_SNIPPET = `CREATE EXTENSION IF NOT EXISTS pg_uuidv7;`;

/**
 * Returns true iff the given SQL is exactly a single-statement CREATE EXTENSION
 * for pg_uuidv7 with IF NOT EXISTS and a terminating semicolon. Whitespace and
 * casing are normalized.
 */
function isValidCreateExtension(sql) {
  if (typeof sql !== 'string') return false;
  const s = sql.trim().replace(/\s+/g, ' ');
  return /^CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+pg_uuidv7\s*;$/i.test(s);
}

describe('pg_uuidv7 init SQL statement', () => {
  test('accepts the canonical statement from the diff', () => {
    expect(isValidCreateExtension(SQL_SNIPPET)).toBe(true);
  });

  test('accepts flexible whitespace and casing', () => {
    expect(isValidCreateExtension('  create   extension  if not exists   PG_UUIDV7 ;  ')).toBe(true);
  });

  test('requires a terminating semicolon', () => {
    expect(isValidCreateExtension('CREATE EXTENSION IF NOT EXISTS pg_uuidv7')).toBe(false);
  });

  test('requires IF NOT EXISTS for idempotency', () => {
    expect(isValidCreateExtension('CREATE EXTENSION pg_uuidv7;')).toBe(false);
  });

  test('rejects wrong extension names (e.g., uuid-ossp)', () => {
    expect(isValidCreateExtension('CREATE EXTENSION IF NOT EXISTS uuid-ossp;')).toBe(false);
  });

  test('rejects multiple statements or injection attempts', () => {
    expect(isValidCreateExtension('CREATE EXTENSION IF NOT EXISTS pg_uuidv7; DROP TABLE users;')).toBe(false);
  });

  test('rejects non-string inputs gracefully', () => {
    for (const bad of [null, undefined, 0, 1.23, {}, [], () => {}]) {
      expect(isValidCreateExtension(bad)).toBe(false);
    }
  });
});