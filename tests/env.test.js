/**
 * Tests for env schema using @t3-oss/env-nextjs.
 *
 * Testing library/framework note:
 * - This test file uses standard Jest/Vitest syntax (describe/it/expect, beforeEach/afterEach).
 * - It should run under either Jest or Vitest based on the project's configuration.
 *
 * These tests focus on behaviors defined in the diff:
 * - Required server vars: AUTH_DISCORD_ID, AUTH_DISCORD_SECRET, DATABASE_URL (must be a valid URL), CONTEXT7_API_KEY
 * - AUTH_SECRET is required in production, optional otherwise
 * - NODE_ENV enum default 'development'
 * - skipValidation via SKIP_ENV_VALIDATION
 * - emptyStringAsUndefined: empty strings are treated as undefined and should fail required fields
 */

const path = require('path');

const ENV_MODULE_PATH = (() => {
  // Keep in sync with shell script detection
  const candidates = [
    'src/env',
    'env',
    'src/env.mjs',
    'src/env.ts',
    'src/env.js',
    'env.mjs',
    'env.ts',
    'env.js',
  ];
  for (const c of candidates) {
    try {
      // Resolve without extension if possible
      return require.resolve(path.resolve(process.cwd(), c));
    } catch (_e) {
      // try with extensions explicitly
      for (const ext of ['.ts', '.js', '.mjs', '.cjs']) {
        try {
          return require.resolve(path.resolve(process.cwd(), c.endsWith(ext) ? c : c + ext));
        } catch (__e) {}
      }
    }
  }
  // Fallback to src/env (resolved later)
  try {
    return require.resolve(path.resolve(process.cwd(), 'src/env'));
  } catch {
    // As an extreme fallback, just return 'src/env' and let dynamic import handle (may fail loudly to guide maintainer)
    return path.resolve(process.cwd(), 'src/env');
  }
})();

/**
 * Helper to load env module fresh each time after mutating process.env.
 * Works for both CommonJS and ESM transpiled env files (via dynamic import).
 */
async function loadEnvFresh() {
  // Clear module cache
  // For Jest/Vitest (CommonJS):
  Object.keys(require.cache).forEach((k) => {
    if (k.includes(path.sep + 'env') || k.endsWith(`${path.sep}env.js`) || k.endsWith(`${path.sep}env.mjs`) || k.endsWith(`${path.sep}env.ts`)) {
      delete require.cache[k];
    }
  });

  // Attempt require first
  try {
    const mod = require(ENV_MODULE_PATH);
    return mod.env || mod.default?.env || mod.default || mod;
  } catch (e) {
    // Fallback to dynamic import (for ESM transpiled)
    const mod = await import(pathToFileUrl(ENV_MODULE_PATH));
    return mod.env || mod.default?.env || mod.default || mod;
  }
}

function pathToFileUrl(p) {
  const { pathToFileURL } = require('url');
  return pathToFileURL(p).href;
}

const REQUIRED_BASE = {
  AUTH_DISCORD_ID: 'discord-id',
  AUTH_DISCORD_SECRET: 'discord-secret',
  DATABASE_URL: 'https://db.example.com/instance',
  CONTEXT7_API_KEY: 'ctx7-key',
};

const cleanEnv = (overrides = {}) => {
  const preserved = { ...process.env };
  // Start with clean slate to avoid leakage from runner
  for (const k of Object.keys(process.env)) {
    delete process.env[k];
  }
  // Default NODE_ENV to 'test' typical runner; individual tests set their own
  process.env.NODE_ENV = 'test';
  // Apply required base unless a test wants to remove/change
  Object.assign(process.env, REQUIRED_BASE, overrides);

  return () => {
    // restore
    for (const k of Object.keys(process.env)) delete process.env[k];
    Object.assign(process.env, preserved);
  };
};

describe('env schema validation', () => {
  let restore;

  afterEach(() => {
    if (restore) restore();
    restore = undefined;
  });

  it('loads with all required vars in non-production when AUTH_SECRET omitted (optional outside prod)', async () => {
    restore = cleanEnv({ NODE_ENV: 'development' });
    const env = await loadEnvFresh();
    expect(env.AUTH_DISCORD_ID).toBe(REQUIRED_BASE.AUTH_DISCORD_ID);
    expect(env.AUTH_DISCORD_SECRET).toBe(REQUIRED_BASE.AUTH_DISCORD_SECRET);
    expect(env.DATABASE_URL).toBe(REQUIRED_BASE.DATABASE_URL);
    expect(env.CONTEXT7_API_KEY).toBe(REQUIRED_BASE.CONTEXT7_API_KEY);
    // AUTH_SECRET optional → undefined is acceptable in development
    expect(env.AUTH_SECRET).toBeUndefined();
    // NODE_ENV zod enum default('development'), but runtimeEnv passes through process.env.NODE_ENV; assert passthrough
    expect(env.NODE_ENV).toBe('development');
  });

  it('throws when required vars are missing (e.g., AUTH_DISCORD_ID)', async () => {
    restore = cleanEnv({ AUTH_DISCORD_ID: undefined });
    // Remove from env
    delete process.env.AUTH_DISCORD_ID;

    await expect(loadEnvFresh()).rejects.toThrow(/AUTH_DISCORD_ID/i);
  });

  it('treats empty strings as undefined for required fields', async () => {
    restore = cleanEnv({ AUTH_DISCORD_SECRET: '' });
    await expect(loadEnvFresh()).rejects.toThrow(/AUTH_DISCORD_SECRET/i);
  });

  it('validates DATABASE_URL must be a valid URL', async () => {
    restore = cleanEnv({ DATABASE_URL: 'not-a-url' });
    await expect(loadEnvFresh()).rejects.toThrow(/DATABASE_URL/i);
  });

  it('requires AUTH_SECRET in production', async () => {
    restore = cleanEnv({ NODE_ENV: 'production' });
    // No AUTH_SECRET provided → should fail
    await expect(loadEnvFresh()).rejects.toThrow(/AUTH_SECRET/i);
  });

  it('accepts AUTH_SECRET in production when provided', async () => {
    restore = cleanEnv({ NODE_ENV: 'production', AUTH_SECRET: 'super-secret' });
    const env = await loadEnvFresh();
    expect(env.AUTH_SECRET).toBe('super-secret');
    expect(env.NODE_ENV).toBe('production');
  });

  it('SKIP_ENV_VALIDATION bypasses validation even with missing/invalid vars', async () => {
    restore = cleanEnv({
      AUTH_DISCORD_ID: undefined,
      DATABASE_URL: 'not-a-url',
      SKIP_ENV_VALIDATION: '1',
    });
    delete process.env.AUTH_DISCORD_ID;

    const env = await loadEnvFresh();
    // Expect module to load without throwing and env object to exist.
    expect(env).toBeTruthy();
    // Since validation is skipped, fields may be undefined/invalid as set.
    expect(env.AUTH_DISCORD_ID).toBeUndefined();
    expect(env.DATABASE_URL).toBe('not-a-url');
  });

  it('NODE_ENV defaults to "development" when undefined (enum default)', async () => {
    restore = cleanEnv({});
    delete process.env.NODE_ENV; // remove to trigger default in zod enum
    const env = await loadEnvFresh();
    // Note: runtimeEnv passes process.env.NODE_ENV; when undefined, zod default('development') applies.
    expect(env.NODE_ENV).toBe('development');
  });

  it('empty string for AUTH_SECRET outside production is treated as undefined and allowed', async () => {
    restore = cleanEnv({ NODE_ENV: 'test', AUTH_SECRET: '' });
    const env = await loadEnvFresh();
    expect(env.AUTH_SECRET).toBeUndefined();
    expect(env.NODE_ENV).toBe('test');
  });
});