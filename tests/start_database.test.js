/* 
  Tests for start-database.sh
  Assumes Jest-style test runner (Jest or compatible).
  These tests stub external CLIs by prepending a fake bin directory to PATH.
*/
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const SCRIPT = process.env.START_DB_SCRIPT_PATH || "/home/jailuser/git/start-database.sh";

function makeTmpDir(prefix = "start-db-test-") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return dir;
}

function writeFileSyncRecursive(filePath, content, mode) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, { mode });
}

function createStub(binDir, name, script, opts = { executable: true }) {
  const file = path.join(binDir, name);
  writeFileSyncRecursive(file, script, opts.executable ? 0o755 : 0o644);
  return file;
}

function runScript(cwd, binDir, input = "", envExtra = {}) {
  return new Promise((resolve) => {
    const child = spawn(SCRIPT, {
      cwd,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH || ''}`,
        // Ensure non-interactive locales do not break prompts
        LC_ALL: 'C',
        LANG: 'C',
        ...envExtra,
      }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('close', code => resolve({ code, stdout, stderr }));
    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

function makeEnvFile(dir, { user = 'postgres', pass = 'password', host = 'localhost', port = 5433, db = 'mydb' } = {}) {
  const envPath = path.join(dir, '.env');
  const url = `postgres://${user}:${pass}@${host}:${port}/${db}`;
  fs.writeFileSync(envPath, `DATABASE_URL=${url}\n`);
  return envPath;
}

function setupBase(cwd) {
  // prisma/init.sql is referenced in the docker run volume mount
  writeFileSyncRecursive(path.join(cwd, 'prisma', 'init.sql'), '-- init\n', 0o644);
}

describe('start-database.sh', () => {
  let tmp, bin;

  beforeEach(() => {
    tmp = makeTmpDir();
    bin = path.join(tmp, 'fakebin');
    fs.mkdirSync(bin, { recursive: true });
    setupBase(tmp);
  });

  afterEach(() => {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  });

  test('exits with error when neither docker nor podman is installed', async () => {
    makeEnvFile(tmp, { pass: 'password' });
    // Place non-executable markers to shadow any real binaries
    createStub(bin, 'docker', '#!/usr/bin/env bash\nexit 127\n', { executable: false });
    createStub(bin, 'podman', '#!/usr/bin/env bash\nexit 127\n', { executable: false });

    const { code, stdout, stderr } = await runScript(tmp, bin);
    expect(code).toBe(1);
    expect(stdout).toMatch(/Docker or Podman is not installed/i);
    expect(stderr).toBeFalsy();
  });

  test('errors if docker daemon not running', async () => {
    makeEnvFile(tmp, { pass: 'secret' });
    createStub(bin, 'docker', `#!/usr/bin/env bash
if [ "$1" = "info" ]; then exit 1; fi
exit 0
`);
    // Ensure netcat check does not interfere (port not in use)
    createStub(bin, 'nc', '#!/usr/bin/env bash\nexit 1\n');

    const { code, stdout } = await runScript(tmp, bin);
    expect(code).toBe(1);
    expect(stdout).toMatch(/daemon is not running/i);
  });

  test('fails if port is already in use (nc installed)', async () => {
    makeEnvFile(tmp, { port: 5555, pass: 'secret' });
    createStub(bin, 'docker', '#!/usr/bin/env bash\nif [ "$1" = "info" ]; then exit 0; fi\nexit 0\n');
    // Simulate netcat detecting port usage
    createStub(bin, 'nc', '#!/usr/bin/env bash\n# Simulate success on -z check\nexit 0\n');

    const { code, stdout } = await runScript(tmp, bin);
    expect(code).toBe(1);
    expect(stdout).toMatch(/Port 5555 is already in use/);
  });

  test('warns if nc missing and aborts on user default/no', async () => {
    makeEnvFile(tmp, { pass: 'secret' });
    createStub(bin, 'docker', '#!/usr/bin/env bash\nif [ "$1" = "info" ]; then exit 0; fi\nexit 0\n');
    // No 'nc' in PATH => warning branch
    const { code, stdout } = await runScript(tmp, bin, "n\n");
    expect(stdout).toMatch(/Warning: Unable to check if port .* \(netcat not installed\)/i);
    expect(stdout).toMatch(/Aborting\./);
    expect(code).toBe(1);
  });

  test('exits 0 if container already running', async () => {
    makeEnvFile(tmp, { db: 'projdb' });
    createStub(bin, 'docker', `#!/usr/bin/env bash
if [ "$1" = "info" ]; then exit 0; fi
if [ "$1" = "ps" ] && [ "$2" = "-q" ] && [ "$3" = "-f" ]; then
  # When checking running containers, output a fake ID to be truthy
  if [[ "$4" == name=projdb-postgres ]]; then echo "abcdef123"; exit 0; fi
fi
exit 0
`);
    createStub(bin, 'nc', '#!/usr/bin/env bash\nexit 1\n');

    const { code, stdout } = await runScript(tmp, bin);
    expect(code).toBe(0);
    expect(stdout).toMatch(/Database container 'projdb-postgres' already running/);
  });

  test('starts existing stopped container and exits 0', async () => {
    makeEnvFile(tmp, { db: 'coldstart' });
    createStub(bin, 'docker', `#!/usr/bin/env bash
if [ "$1" = "info" ]; then exit 0; fi
if [ "$1" = "ps" ] && [ "$2" = "-q" ] && [ "$3" = "-f" ]; then
  # First check (running) => empty
  if [[ "$4" == name=coldstart-postgres ]]; then exit 0; fi
fi
if [ "$1" = "ps" ] && [ "$2" = "-q" ] && [ "$3" = "-a" ] && [ "$4" = "-f" ]; then
  # Second check (all) => show existing container ID
  if [[ "$5" == name=coldstart-postgres ]]; then echo "stopped123"; exit 0; fi
fi
if [ "$1" = "start" ] && [[ "$2" == "coldstart-postgres" ]]; then exit 0; fi
exit 0
`);
    createStub(bin, 'nc', '#!/usr/bin/env bash\nexit 1\n');

    const { code, stdout } = await runScript(tmp, bin);
    expect(code).toBe(0);
    expect(stdout).toMatch(/Existing database container 'coldstart-postgres' started/);
  });

  test('prompts on default password and aborts when user declines', async () => {
    makeEnvFile(tmp, { pass: 'password', db: 'decline' });
    createStub(bin, 'docker', '#!/usr/bin/env bash\nif [ "$1" = "info" ]; then exit 0; fi\nexit 0\n');
    createStub(bin, 'nc', '#!/usr/bin/env bash\nexit 1\n');

    const { code, stdout } = await runScript(tmp, bin, "n\n");
    expect(code).toBe(1);
    expect(stdout).toMatch(/You are using the default database password/);
    expect(stdout).toMatch(/Please change the default password/);
  });

  test('generates random password and runs container with updated env', async () => {
    makeEnvFile(tmp, { pass: 'password', port: 6543, db: 'agree' });

    // Stub openssl to emit deterministic bytes (include + and / to exercise tr)
    createStub(bin, 'openssl', '#!/usr/bin/env bash\necho "AA++//aaBBccdd"\n');
    // Stub sed to succeed without changing file (we only assert docker args)
    createStub(bin, 'sed', '#!/usr/bin/env bash\nexit 0\n');
    // Stub nc to report port free
    createStub(bin, 'nc', '#!/usr/bin/env bash\nexit 1\n');

    // Docker stub logs args to a file so we can assert envs and ports
    const logDir = path.join(tmp, 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    const dockerStub = `#!/usr/bin/env bash
if [ "$1" = "info" ]; then exit 0; fi
echo "$@" >> "${LOG}"
exit 0
`;
    createStub(bin, 'docker', dockerStub.replace('${LOG}', path.join(logDir, 'docker_args.log')));

    const { code, stdout } = await runScript(tmp, bin, "y\n");
    expect(code).toBe(0);
    expect(stdout).toMatch(/was successfully created/);

    // Read captured args
    const args = fs.readFileSync(path.join(logDir, 'docker_args.log'), 'utf8');
    // Expect transformed password (+ -> -, / -> _)
    expect(args).toMatch(/-e POSTGRES_PASSWORD="AA--__aaBBccdd"/);
    expect(args).toMatch(/-e POSTGRES_DB="agree"/);
    expect(args).toMatch(/-p 6543:5432/);
  });

  test('uses provided non-default password and runs container', async () => {
    makeEnvFile(tmp, { pass: 's3cr3t', port: 7777, db: 'manual' });
    createStub(bin, 'nc', '#!/usr/bin/env bash\nexit 1\n');
    const logDir = path.join(tmp, 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    createStub(bin, 'docker', `#!/usr/bin/env bash
if [ "$1" = "info" ]; then exit 0; fi
echo "$@" >> "${LOG}"
exit 0
`.replace('${LOG}', path.join(logDir, 'docker_args.log')));

    const { code, stdout } = await runScript(tmp, bin);
    expect(code).toBe(0);
    const args = fs.readFileSync(path.join(logDir, 'docker_args.log'), 'utf8');
    expect(args).toMatch(/-e POSTGRES_PASSWORD="s3cr3t"/);
    expect(args).toMatch(/-e POSTGRES_DB="manual"/);
    expect(args).toMatch(/-p 7777:5432/);
  });
});