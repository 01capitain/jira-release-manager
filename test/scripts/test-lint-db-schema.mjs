 import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scriptPath = path.resolve(process.cwd(), 'scripts', 'disallow-boolean-fields.mjs');
const invalidSchemaPath = path.resolve(__dirname, 'invalid.prisma');
const validSchemaPath = path.resolve(__dirname, 'valid.prisma');

const ignoredSchemaPath = path.resolve(__dirname, 'ignored.prisma');

const runTest = (schemaPath, expectFailure) => {
  return new Promise((resolve, reject) => {
    exec(`node ${scriptPath} ${schemaPath}`, (error, stdout, stderr) => {
      const success = expectFailure ? error !== null : error === null;
      if (success) {
        const message = expectFailure
          ? `✅ Test passed: Boolean value was caught as expected in ${path.basename(schemaPath)}`
          : `✅ Test passed: No boolean values found in ${path.basename(schemaPath)}, as expected.`;
        console.log(message);
        resolve();
      } else {
        console.error(`❌ Test failed for ${path.basename(schemaPath)}`);
        console.error(`Expected ${expectFailure ? 'failure' : 'success'}, but got the opposite.`);
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
    console.log('✅ All tests passed!');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
