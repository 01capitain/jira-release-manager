import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scriptPath = path.resolve(process.cwd(), 'scripts', 'disallow-boolean-fields.mjs');
const invalidSchemaPath = path.resolve(__dirname, 'disallow-boolean-fields/invalid.test-prisma');
const validSchemaPath = path.resolve(__dirname, 'disallow-boolean-fields/valid.test-prisma');

const ignoredSchemaPath = path.resolve(__dirname, 'disallow-boolean-fields/ignored.test-prisma');

const runTest = (schemaPath, expectFailure) => {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [scriptPath, schemaPath], (error, stdout, stderr) => {
      const exitCode = error ? error.code ?? 1 : 0;
      const success = expectFailure ? exitCode === 1 : exitCode === 0;
      if (success) {
        const message = expectFailure
          ? `✅ Test passed: Boolean value was caught as expected in ${path.basename(schemaPath)}`
          : `✅ Test passed: No boolean values found in ${path.basename(schemaPath)}, as expected.`;
        console.log(message);
        resolve();
      } else {
        console.error(`❌ Test failed for ${path.basename(schemaPath)}`);
        console.error(`Expected ${expectFailure ? 'exit code 1' : 'exit code 0'}, but got ${exitCode}.`);
        console.error('STDOUT:', stdout);
        console.error('STDERR:', stderr);
        reject();
      }
    });
  });
};

Promise.all([
  runTest(invalidSchemaPath, true),
  runTest(validSchemaPath, false),
  runTest(ignoredSchemaPath, false),
])
  .then(() => {
    console.log('✅ Base tests passed! Running extended suite…');
    // Defer exit to extended suite
  })
  .catch(() => {
    process.exit(1);
  });

// ---- Extended scenarios appended by CI generator ----

const runTestWithOutput = (schemaPath, expectFailure, { expectStdoutIncludes = [], expectStderrIncludes = [] } = {}) => {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [scriptPath, schemaPath], (error, stdout, stderr) => {
      const exitCode = error ? (error.code ?? 1) : 0;
      const success = expectFailure ? exitCode === 1 : exitCode === 0;
      const prefix = path.basename(schemaPath);
      const checkTextIncludes = (text, arr, streamName) => {
        for (const needle of arr) {
          if (!text.includes(needle)) {
            console.error(`❌ Expected ${streamName} to include:`, needle);
            console.error(`${streamName.toUpperCase()}:`, text);
            return false;
          }
        }
        return true;
      };
      if (
        success &&
        checkTextIncludes(stdout, expectStdoutIncludes, "stdout") &&
        checkTextIncludes(stderr, expectStderrIncludes, "stderr")
      ) {
        console.log(`✅ [${prefix}] exit ${exitCode} as expected${expectFailure ? " (failure)" : " (success)"}`);
        resolve();
      } else {
        console.error(`❌ [${prefix}] Unexpected exit code ${exitCode}. Expected ${expectFailure ? 1 : 0}.`);
        console.error('STDOUT:', stdout);
        console.error('STDERR:', stderr);
        reject();
      }
    });
  });
};

async function runExtendedSuite() {
  // Nonexistent file: should fail
  await runTestWithOutput(path.resolve(__dirname, "disallow-boolean-fields/nonexistent_DOES_NOT_EXIST.test-prisma"), true);

  // Multiple invalids: should fail and ideally list multiple hits
  await runTestWithOutput(path.resolve(__dirname, "disallow-boolean-fields/multiple-invalid.test-prisma"), true, {
    expectStderrIncludes: ["Boolean", "isActive", "isAdmin", "flags", "published"]
  });

  // Commented occurrences only: should pass with empty stdout/stderr
  await runTestWithOutput(path.resolve(__dirname, "disallow-boolean-fields/commented-only.test-prisma"), false);

  // Empty schema: should pass
  await runTestWithOutput(path.resolve(__dirname, "disallow-boolean-fields/empty.test-prisma"), false);

  // Benign "Boolean" in strings/enums/model names: should pass
  await runTestWithOutput(path.resolve(__dirname, "disallow-boolean-fields/benign-strings.test-prisma"), false);

  // Top-of-file ignore pragma (if supported): should fail
  await runTestWithOutput(path.resolve(__dirname, "disallow-boolean-fields/ignored-top-comment.test-prisma"), true);
}

runExtendedSuite()
  .then(() => console.log("✅ Extended schema lint tests passed!"))
  .catch(() => { console.error("❌ Extended schema lint tests failed"); process.exit(1); });