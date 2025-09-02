import fs from 'fs';
import path from 'path';

const filePath = process.argv[2];
const schemaPath = filePath ? path.resolve(process.cwd(), filePath) : path.resolve(process.cwd(), 'prisma', 'schema.prisma');

fs.readFile(schemaPath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading schema file: ${err}`);
    process.exit(1);
  }

  const lines = data.split('\n');
  const booleanRegex = /\s+Boolean\b/;
  const ignoreRegex = /prisma-lint-ignore-next-line/;
  let errorFound = false;

  lines.forEach((line, index) => {
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

