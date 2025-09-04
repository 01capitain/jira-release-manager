/**
 * ESM variant of agentsMd tests for repositories with "type": "module".
 * Framework: Jest or Vitest (describe/it/expect globals).
 */
import fs from 'fs';
import path from 'path';

const fileExists = (rel) => fs.existsSync(path.resolve(process.cwd(), rel));
const readFileSafe = (rel) => {
  try {
    return fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
  } catch {
    return '';
  }
};
const readJsonSafe = (p) => {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), p), 'utf8'));
  } catch {
    return null;
  }
};

describe('AGENTS.md and repository guideline conformance (ESM)', () => {
  const agentsPathCandidates = ['AGENTS.md', 'docs/AGENTS.md', 'docs/guides/AGENTS.md'];
  const agentsPath = agentsPathCandidates.find(fileExists);

  it('should have AGENTS.md present at a known location', () => {
    expect(agentsPath).toBeTruthy();
  });

  it('should have docs/guides directory present', () => {
    expect(fileExists('docs/guides')).toBe(true);
  });

  it('AGENTS.md should include the "Available Tools" section and the shadcn MCP guidance', () => {
    expect(agentsPath).toBeTruthy();
    const md = readFileSafe(agentsPath || '');
    expect(md).toMatch(/^\s*##\s*Available Tools\s*$/m);
    expect(md).toMatch(/shadcn\s+mcp\s+server/i);
    expect(md).toMatch(/Use it only when you are implementing on the react frontend\./i);
  });

  it('AGENTS.md should document the Typescript trivia greeting prefix', () => {
    expect(agentsPath).toBeTruthy();
    const md = readFileSafe(agentsPath || '');
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
        keys.some(k => /test|lint|type-?check|build|format|fmt|check/i.test(k));
      expect(hasHealth).toBe(true);
    });
  });
});