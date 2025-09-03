import fs from 'fs';
import path from 'path';

const filePath = process.argv[2];
const schemaPath = filePath ? path.resolve(process.cwd(), filePath) : path.resolve(process.cwd(), 'prisma', 'schema.prisma');

fs.readFile(schemaPath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading schema file "${schemaPath}": ${err.message}`);
    process.exit(1);
  }

  const lines = data.split(/\r?\n/);
  const booleanRegex = /^\s*[A-Za-z_][A-Za-z0-9_]*\s+Boolean\b/;
  const ignoreRegex = /^\s*\/\/\s*prisma-lint-ignore-next-line\b/;
  let errorFound = false;

  lines.forEach((line, index) => {
    if (/^\s*\/\//.test(line)) {
      return;
    }

    if (booleanRegex.test(line)) {
      const previousLine = index > 0 ? lines[index - 1] : '';
      if (!ignoreRegex.test(previousLine)) {
        console.error(`Error in ${schemaPath} on line ${index + 1}:`);
        console.error(`> ${line.trim()}`);
        console.error('The "Boolean" type is not allowed in the database schema. Please use a timestamp or a status enum instead.');
        errorFound = true;
      }
    }
  });

  if (errorFound) {
    process.exit(1);
  } else {
    console.log(`✅ Prisma schema linting passed for ${schemaPath}: No Boolean types found.`);
    process.exit(0);
  }
});

