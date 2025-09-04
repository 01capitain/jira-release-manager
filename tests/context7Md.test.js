/**
 * Test framework: Jest (Vitest compatible). These tests use describe/test/expect, common to both.
 *
 * Scope: Validate the Markdown-like content provided in the PR snippet (front matter + sections).
 * Focus: Front matter schema, value validity, and required sections/mentions.
 * Includes: Happy paths, edge cases, and failure conditions for the parser/validators.
 */

/* eslint-disable no-undef */

const DOC = `---
homepage: "context7.com"
dashboard: "https://context7.com/dashboard"
---

# Use case

Conntected as mcp server to gemini cli to provide a realiable source of code documentation @see [.gemini/settings.json]

# Configuration

An API Key is provided in the .env file in order to not get rate limited. It is free of charge as long as you are authenticated by a github account (which I connected to).`;

/**
 * Minimal front matter parser for simple "key: value" pairs with optional quotes.
 * Throws on:
 *  - Missing or unterminated front matter block
 *  - Invalid lines that don't match "key: value"
 */
function parseFrontMatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error('Front matter block not found');
  const yaml = m[1];

  // Basic unterminated guard: if there is another starting '---' before closing, treat as invalid
  if (/^---\s*$/m.test(yaml)) {
    throw new Error('Unterminated or nested front matter detected');
  }

  const data = {};
  const lines = yaml.split('\n').filter((ln) => ln.trim().length > 0);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.+?)\s*$/);
    if (!match) throw new Error(`Invalid front matter line: ${line}`);
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    data[match[1]] = val;
  }
  return data;
}

function isValidDomainOrUrl(str) {
  // Accept plain domains or http(s) URLs; reject spaces and obvious emails
  if (/\s/.test(str) || /@/.test(str)) return false;
  const pattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
  return pattern.test(str);
}

function isHttpsUrl(str) {
  return /^https:\/\/[^\s]+$/.test(str);
}

describe('context7Md front matter and content', () => {
  describe('happy path validations (current content)', () => {
    test('has a YAML front matter block with required keys', () => {
      const fm = parseFrontMatter(DOC);
      expect(fm).toHaveProperty('homepage');
      expect(fm).toHaveProperty('dashboard');
      expect(fm.homepage).toBeTruthy();
      expect(fm.dashboard).toBeTruthy();
    });

    test('homepage is a valid domain or URL', () => {
      const { homepage } = parseFrontMatter(DOC);
      expect(isValidDomainOrUrl(homepage)).toBe(true);
    });

    test('dashboard is a valid HTTPS URL', () => {
      const { dashboard } = parseFrontMatter(DOC);
      expect(isHttpsUrl(dashboard)).toBe(true);
    });

    test('parser strips quotes from values', () => {
      const fm = parseFrontMatter(DOC);
      expect(fm.homepage).toBe('context7.com');
      expect(fm.dashboard).toBe('https://context7.com/dashboard');
    });

    test('document contains required sections', () => {
      expect(DOC).toMatch(/^# Use case/m);
      expect(DOC).toMatch(/^# Configuration/m);
    });

    test('document references important artifacts (.env and .gemini/settings.json)', () => {
      expect(DOC).toContain('.env');
      expect(DOC).toContain('.gemini/settings.json');
    });
  });

  describe('edge cases and failure conditions', () => {
    test('throws when front matter block is missing', () => {
      const noFm = DOC.replace(/^---[\s\S]*?---\n/, '');
      expect(() => parseFrontMatter(noFm)).toThrow(/Front matter/);
    });

    test('throws when a front matter line is malformed', () => {
      const invalid = DOC.replace('homepage: "context7.com"', 'homepage "context7.com"');
      expect(() => parseFrontMatter(invalid)).toThrow(/Invalid front matter line/);
    });

    test('rejects nested/unterminated front matter blocks', () => {
      const broken = DOC.replace('homepage: "context7.com"', '---\nhomepage: "context7.com"');
      expect(() => parseFrontMatter(broken)).toThrow(/Unterminated|nested/);
    });

    test('non-HTTPS dashboard fails HTTPS validation', () => {
      expect(isHttpsUrl('http://context7.com/dashboard')).toBe(false);
      expect(isHttpsUrl('https://context7.com/dashboard')).toBe(true);
    });

    test('homepage must be domain-like (rejects emails and whitespace)', () => {
      expect(isValidDomainOrUrl('user@context7.com')).toBe(false);
      expect(isValidDomainOrUrl('context7.com ')).toBe(false);
      expect(isValidDomainOrUrl('context7.com')).toBe(true);
    });

    test('accepts unquoted values too', () => {
      const alt = DOC.replace('"context7.com"', 'context7.com').replace('"https://context7.com/dashboard"', 'https://context7.com/dashboard');
      const fm = parseFrontMatter(alt);
      expect(fm.homepage).toBe('context7.com');
      expect(fm.dashboard).toBe('https://context7.com/dashboard');
    });
  });
});