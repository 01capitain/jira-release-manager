/**
 * NOTE ON TESTING LIB/FRAMEWORK:
 * - This test is written using Jest-style APIs (describe, test, expect).
 * - If your repo uses Vitest, it is compatible with the same APIs.
 * - If your repo uses Mocha+Chai, you can adjust to 'describe/it' and Chai's expect.
 *
 * Purpose:
 * Validate the .env.example file remains correct, complete, and safe:
 *  - Contains all expected keys
 *  - Does not contain secrets (placeholders should be empty or obviously dummy)
 *  - DATABASE_URL has the documented default format/value
 *  - Comments remain informative and core links remain present
 */

const fs = require('fs');
const path = require('path');

function parseDotEnvExample(content) {
  // naive parser that understands KEY="value" or KEY=value and ignores commented/blank lines
  const lines = content.split(/\r?\n/);
  const out = {};
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    // split on first '='
    const idx = line.indexOf('=');
    if (idx === -1) continue; // malformed line - tolerate but we can assert later if needed
    const key = line.slice(0, idx).trim();
    // Handle quoted values and unquoted values, preserve empty string
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

describe('.env.example integrity', () => {
  const envExamplePath = path.resolve(process.cwd(), '.env.example');
  let content;
  let parsed;

  beforeAll(() => {
    // Ensure the file exists
    expect(fs.existsSync(envExamplePath)).toBe(true);
    content = fs.readFileSync(envExamplePath, 'utf8');
    parsed = parseDotEnvExample(content);
  });

  test('contains expected header comments and references', () => {
    expect(content).toMatch(/Since the "\.env" file is gitignored/i);
    expect(content).toMatch(/Next Auth/i);
    expect(content).toMatch(/npx auth secret/i);
    expect(content).toMatch(/https:\/\/next-auth\.js\.org\/configuration\/options#secret/i);
    expect(content).toMatch(/Prisma/i);
    expect(content).toMatch(/https:\/\/www\.prisma\.io\/docs\/reference\/database-reference\/connection-urls#env/i);
    expect(content).toMatch(/Context7/i);
    expect(content).toMatch(/https:\/\/context7\.com\/dashboard/i);
  });

  test('includes all required keys with safe placeholder values', () => {
    const expectedKeys = [
      'AUTH_SECRET',
      'AUTH_DISCORD_ID',
      'AUTH_DISCORD_SECRET',
      'DATABASE_URL',
      'CONTEXT7_API_KEY',
    ];

    // All keys present
    for (const k of expectedKeys) {
      expect(parsed).toHaveProperty(k);
    }

    // Secrets should not be populated in example file (empty string placeholders are OK)
    expect(parsed.AUTH_SECRET).toBeDefined();
    expect(parsed.AUTH_DISCORD_ID).toBeDefined();
    expect(parsed.AUTH_DISCORD_SECRET).toBeDefined();
    expect(parsed.CONTEXT7_API_KEY).toBeDefined();

    // Enforce that no example secrets are accidentally committed
    const secretLike = [
      parsed.AUTH_SECRET,
      parsed.AUTH_DISCORD_ID,
      parsed.AUTH_DISCORD_SECRET,
      parsed.CONTEXT7_API_KEY,
    ];
    for (const v of secretLike) {
      // Allow empty string or clearly dummy single word like "example" or "placeholder"
      const isEmpty = v === '' || v === undefined;
      const isClearlyDummy = /^(example|placeholder|changeme|your_.*|dummy)$/i.test(String(v || ''));
      expect(isEmpty || isClearlyDummy).toBe(true);
    }
  });

  test('DATABASE_URL uses the documented local Postgres default', () => {
    // The snippet shows:
    // DATABASE_URL="postgresql://postgres:password@localhost:5432/jira-release-manager"
    const v = parsed.DATABASE_URL;
    expect(v).toBeDefined();
    // Format check
    expect(v).toMatch(/^postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/[A-Za-z0-9_\-]+$/);

    // Specific default value check for safety regression
    expect(v).toBe('postgresql://postgres:password@localhost:5432/jira-release-manager');
  });

  test('no accidental secrets present in file content (heuristic)', () => {
    // Heuristics: forbid obvious secret-like patterns in example file
    // - Long hex strings (>= 24 chars)
    // - JWT-like structure
    // - Base64 strings with high entropy (heuristic length >= 32 and charset)
    const forbiddenPatterns = [
      /\b[a-f0-9]{24,}\b/i,                   // long hex
      /\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b/, // JWT-like
      /\b[A-Za-z0-9+\/]{32,}={0,2}\b/,       // base64-ish
      /sk_live_[A-Za-z0-9]{20,}/i,           // common vendor live keys
      /AKIA[0-9A-Z]{16}/,                    // AWS access key ID
    ];
    forbiddenPatterns.forEach((re) => {
      expect(re.test(content)).toBe(false);
    });
  });

  test('each non-comment variable line follows KEY=VALUE syntax', () => {
    const lines = content.split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      expect(line).toMatch(/^[A-Z0-9_]+=/);
    }
  });

  test('document points developers to keep /src/env.js in sync', () => {
    expect(content).toMatch(/schema in "\/src\/env\.js" should be updated/i);
  });
});