/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      { useESM: true, tsconfig: "tsconfig.json", isolatedModules: true },
    ],
  },
  moduleNameMapper: {
    // Map TS path alias '~/' to src/ for Jest
    "^~/(.*)$": "<rootDir>/src/$1",
  },
};

export default config;
