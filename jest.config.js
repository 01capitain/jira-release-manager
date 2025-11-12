/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  transform: {
    "^.+\\.[tj]sx?$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.json" }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(?:@t3-oss/env-nextjs|@t3-oss/env-core)/)",
  ],
  moduleNameMapper: {
    // Map TS path alias '~/' to src/ for Jest
    "^~/(.*)$": "<rootDir>/src/$1",
    "^next-auth$": "<rootDir>/tests/stubs/next-auth.ts",
    "^@t3-oss/env-nextjs$": "<rootDir>/tests/stubs/t3-env-nextjs.ts",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "mjs", "cjs", "json", "node"],
};

export default config;
