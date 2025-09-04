/**
 * Tests for AGENTS.md guidelines and related repository policies.
 *
 * Test framework: This suite is written to run under Jest (preferred).
 * If Vitest is used in this repository, the global API is largely compatible
 * (describe/it/expect), so these tests should also work there without changes.
 *
 * What we validate:
 *  - AGENTS.md exists and contains key guidelines from the PR diff.
 *  - docs/guides directory exists (strictly required by the guideline).
 *  - Package manager policy is pnpm (via pnpm-lock.yaml or package.json.packageManager).
 *  - package.json contains at least one "health" script among: test, lint, typecheck, build, format.
 *  - AGENTS.md includes "## Available Tools" and mentions the shadcn MCP server usage scope.
 *  - The trivia prefix guidance is documented to ensure consistent agent greeting.
 *
 * Note: These are repository/docs validation tests (not runtime agent tests),
 * aligned with the request to create meaningful validation when direct unit tests
 * aren't applicable. They provide early warnings if guidelines drift.
 */

const fs = require('fs');
const path = require('path');

function readJsonSafe(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function fileExists(rel) {
  return fs.existsSync(path.resolve(process.cwd(), rel));
}

function readFileSafe(rel) {
  try {
    return fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
  } catch (_) {
    return '';
  }
}

describe('AGENTS.md and repository guideline conformance', () => {
  const agentsPathCandidates = [
    'AGENTS.md',
    'docs/AGENTS.md',
    'docs/guides/AGENTS.md',
  ];
  const agentsPath = agentsPathCandidates.find(fileExists);

  it('should have AGENTS.md present at a known location', () => {
    expect(agentsPath).toBeTruthy();
  });

  it('should have docs/guides directory present', () => {
    expect(fileExists('docs/guides')).toBe(true);
  });

  it('AGENTS.md should include the "Available Tools" section and the shadcn MCP guidance', () => {
    // If AGENTS.md missing, fail clearly with context
    expect(agentsPath).toBeTruthy();
    const md = readFileSafe(agentsPath || '');
    expect(md).toMatch(/^\s*##\s*Available Tools\s*$/m);
    expect(md).toMatch(/shadcn\s+mcp\s+server/i);
    // Scope restriction: "Use it only when you are implementing on the react frontend."
    expect(md).toMatch(/Use it only when you are implementing on the react frontend\./i);
  });

  it('AGENTS.md should document the Typescript trivia greeting prefix', () => {
    expect(agentsPath).toBeTruthy();
    const md = readFileSafe(agentsPath || '');
    // Ensure the exact prefix text appears as policy
    expect(md).toMatch(/As requested in AGENTS\.md, some trivia:\s*/);
  });

  it('AGENTS.md should reference following guides in /docs/guides', () => {
    expect(agentsPath).toBeTruthy();
    const md = readFileSafe(agentsPath || '');
    expect(md).toMatch(/\/docs\/guides/);
  });

  describe('Package manager policy (pnpm)', () => {
    it('should use pnpm (pnpm-lock.yaml present OR package.json.packageManager starts with "pnpm@")', () => {
      const hasLock = fileExists('pnpm-lock.yaml');
      const pkg = readJsonSafe('package.json');
      const pkgMgr = pkg && typeof pkg.packageManager === 'string' ? pkg.packageManager : '';
      const declaresPnpm = /^pnpm@/i.test(pkgMgr || '');
      expect(hasLock || declaresPnpm).toBe(true);
    });
  });

  describe('Health scripts in package.json', () => {
    it('should include at least one health-related script (test | lint | typecheck | build | format)', () => {
      const pkg = readJsonSafe('package.json');
      expect(pkg).toBeTruthy();
      const scripts = (pkg && pkg.scripts) || {};
      const keys = Object.keys(scripts);
      const hasHealth =
        keys.includes('test') ||
        keys.includes('lint') ||
        keys.includes('typecheck') ||
        keys.includes('build') ||
        keys.includes('format') ||
        keys.includes('fmt') ||
        keys.includes('check') ||
        // Accept common patterns
        keys.some(k => /test|lint|type-?check|build|format|fmt|check/i.test(k));
      expect(hasHealth).toBe(true);
    });
  });
});
