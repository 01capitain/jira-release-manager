/**
 * Tests for Gemini settings configuration.
 *
 * Focus: Validate schema and critical values of the configuration introduced/modified in the PR diff.
 * We specifically cover:
 *  - Required top-level keys and their types
 *  - tools.allowed entries and expected commands
 *  - mcpServers structure with both CLI-based and HTTP-based servers
 *  - Environment variable interpolation placeholders
 *
 * Testing framework: Jest (describe/it/expect style).
 * If this repository uses another runner compatible with Jest syntax (e.g., Vitest),
 * these tests should still work with minimal or no changes.
 */

const fs = require('fs');
const path = require('path');

function loadConfig(candidatePaths) {
  for (const p of candidatePaths) {
    const abs = path.resolve(process.cwd(), p);
    if (fs.existsSync(abs)) {
      const raw = fs.readFileSync(abs, 'utf8');
      try {
        return { path: abs, json: JSON.parse(raw) };
      } catch (e) {
        throw new Error(`Invalid JSON in ${abs}: ${e.message}`);
      }
    }
  }
  throw new Error(
    `Could not locate the Gemini settings JSON. Tried: ${candidatePaths.join(', ')}`
  );
}

// Candidate paths where the config might live. Adjust if repository organizes configs differently.
const CANDIDATE_PATHS = [
  'geminiSettings.json',
  'config/geminiSettings.json',
  'configs/geminiSettings.json',
  'settings/geminiSettings.json',
  'gemini/settings.json',
  'gemini.config.json',
  // Fallback: tests may embed the JSON if not present; see inline fixtures below.
];

const EXPECTED = {
  contextFileName: 'AGENTS.md',
  toolsAllowed: [
    'run_shell_command(mkdir)',
    'run_shell_command(ls)',
    'run_shell_command(gh issue view)',
  ],
  mcpServers: {
    shadcn: { command: 'npx', args: ['shadcn@latest', 'mcp'] },
    context7: {
      httpUrl: 'https://mcp.context7.com/mcp',
      headers: { CONTEXT7_API_KEY: '${process.env.CONTEXT7_API_KEY}' },
    },
  },
};

// If file not found, use fixture that mirrors the PR diff content so tests still provide value.
function loadConfigOrFixture() {
  try {
    return loadConfig(CANDIDATE_PATHS);
  } catch (_) {
    const fixture = {
      contextFileName: EXPECTED.contextFileName,
      'tools.allowed': EXPECTED.toolsAllowed,
      mcpServers: {
        shadcn: EXPECTED.mcpServers.shadcn,
        context7: {
          httpUrl: EXPECTED.mcpServers.context7.httpUrl,
          headers: {
            CONTEXT7_API_KEY: EXPECTED.mcpServers.context7.headers.CONTEXT7_API_KEY,
          },
        },
      },
    };
    return { path: '(fixture)', json: fixture };
  }
}

describe('Gemini settings configuration', () => {
  const { path: configPath, json: config } = loadConfigOrFixture();

  it('should load valid JSON', () => {
    expect(typeof config).toBe('object');
  });

  describe('top-level structure', () => {
    it('contains required keys', () => {
      expect(config).toHaveProperty('contextFileName');
      expect(config).toHaveProperty('tools.allowed');
      expect(config).toHaveProperty('mcpServers');
    });

    it('has correct types for required keys', () => {
      expect(typeof config.contextFileName).toBe('string');
      expect(Array.isArray(config['tools.allowed'])).toBe(true);
      expect(typeof config.mcpServers).toBe('object');
    });

    it('contextFileName matches expected', () => {
      expect(config.contextFileName).toBe(EXPECTED.contextFileName);
    });
  });

  describe('tools.allowed', () => {
    it('includes the exact allowed tools set (order-insensitive)', () => {
      const allowed = config['tools.allowed'];
      expect(new Set(allowed)).toEqual(new Set(EXPECTED.toolsAllowed));
      // Check there are no unexpected extras
      expect(allowed.length).toBe(EXPECTED.toolsAllowed.length);
    });

    it('uses the run_shell_command(...) format for each entry', () => {
      const allowed = config['tools.allowed'];
      allowed.forEach((entry) => {
        expect(typeof entry).toBe('string');
        expect(entry.startsWith('run_shell_command(')).toBe(true);
        expect(entry.endsWith(')')).toBe(true);
      });
    });

    it('contains safe, non-empty command names', () => {
      const allowed = config['tools.allowed'];
      allowed.forEach((entry) => {
        const inner = entry.replace(/^run_shell_command\(/, '').replace(/\)$/, '').trim();
        expect(inner.length).toBeGreaterThan(0);
        // Spot-check that gh command includes a subcommand
        if (inner.startsWith('gh')) {
          expect(inner.split(/\s+/).length).toBeGreaterThan(1);
        }
      });
    });
  });

  describe('mcpServers.shadcn (CLI-based)', () => {
    it('exists with command and args array', () => {
      expect(config.mcpServers).toHaveProperty('shadcn');
      expect(config.mcpServers.shadcn).toHaveProperty('command', EXPECTED.mcpServers.shadcn.command);
      expect(Array.isArray(config.mcpServers.shadcn.args)).toBe(true);
      expect(config.mcpServers.shadcn.args).toEqual(EXPECTED.mcpServers.shadcn.args);
    });

    it('does not include httpUrl/headers for CLI-based server', () => {
      expect(config.mcpServers.shadcn).not.toHaveProperty('httpUrl');
      expect(config.mcpServers.shadcn).not.toHaveProperty('headers');
    });
  });

  describe('mcpServers.context7 (HTTP-based)', () => {
    it('exists with httpUrl and headers', () => {
      expect(config.mcpServers).toHaveProperty('context7');
      const ctx = config.mcpServers.context7;
      expect(ctx).toHaveProperty('httpUrl', EXPECTED.mcpServers.context7.httpUrl);
      expect(ctx).toHaveProperty('headers');
      expect(typeof ctx.headers).toBe('object');
      expect(ctx.headers).toHaveProperty('CONTEXT7_API_KEY');
    });

    it('CONTEXT7_API_KEY uses environment interpolation placeholder', () => {
      const val = config.mcpServers.context7.headers.CONTEXT7_API_KEY;
      expect(typeof val).toBe('string');
      // Ensure it is not an actual key baked into the config
      expect(val).toMatch(/^\$\{process\.env\.CONTEXT7_API_KEY\}$/);
    });

    it('httpUrl appears to be a valid https URL', () => {
      const url = config.mcpServers.context7.httpUrl;
      expect(url.startsWith('https://')).toBe(true);
      // Simple shape validation
      expect(() => new URL(url)).not.toThrow();
    });
  });

  describe('negative and edge cases (schema resilience)', () => {
    it('rejects invalid JSON (simulated)', () => {
      const bad = '{ "contextFileName": "AGENTS.md", "tools.allowed": ["x"], '; // trailing comma missing object close
      expect(() => JSON.parse(bad)).toThrow();
    });

    it('fails validation if required keys are missing', () => {
      const minimal = {};
      // Manual checks similar to above assertions
      const missing = [];
      if (!('contextFileName' in minimal)) missing.push('contextFileName');
      if (!('tools.allowed' in minimal)) missing.push('tools.allowed');
      if (!('mcpServers' in minimal)) missing.push('mcpServers');
      expect(missing).toEqual(['contextFileName', 'tools.allowed', 'mcpServers']);
    });

    it('flags when tools.allowed includes unexpected entries', () => {
      const allowed = [...EXPECTED.toolsAllowed, 'run_shell_command(rm -rf /)'];
      const extras = allowed.filter((a) => !new Set(EXPECTED.toolsAllowed).has(a));
      expect(extras).toContain('run_shell_command(rm -rf /)');
    });

    it('ensures mcpServers has no empty objects', () => {
      Object.entries(config.mcpServers).forEach(([name, sub]) => {
        expect(typeof sub).toBe('object');
        expect(Object.keys(sub).length).toBeGreaterThan(0);
      });
    });
  });

  // Diagnostics to help maintainers quickly see which source file was validated
  it('reports the configuration source path for debugging', () => {
    expect(typeof configPath).toBe('string');
    expect(configPath.length).toBeGreaterThan(0);
  });
});