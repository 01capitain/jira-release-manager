/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.json" }],
  },
  moduleNameMapper: {
    // Map TS path alias '~/' to src/ for Jest
    "^~/(.*)$": "<rootDir>/src/$1",
    "^next-auth$": "<rootDir>/tests/stubs/next-auth.ts",
  },
};

export default config;
