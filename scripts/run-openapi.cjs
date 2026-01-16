// @ts-nocheck
const { register } = require("esbuild-register/dist/node");

register({
  target: "node20",
  tsconfigRaw: {
    compilerOptions: {
      module: "commonjs",
      moduleResolution: "node",
      esModuleInterop: true,
      baseUrl: ".",
      paths: {
        "~/env": ["scripts/openapi-stubs/env"],
        "~/*": ["src/*"],
        "next/server": ["scripts/openapi-stubs/next-server"],
        "@prisma/client": ["scripts/openapi-stubs/prisma-client"],
        "next-auth": ["scripts/openapi-stubs/next-auth"],
      },
    },
  },
});

const path = require("path");
const Module = require("module");
const originalResolveFilename = Module._resolveFilename;

const stubOverrides = new Map([
  ["zod", { target: "zod/v4", passthrough: true }],
  ["~/env", { target: path.join(__dirname, "openapi-stubs/env") }],
  ["@prisma/client", { target: path.join(__dirname, "openapi-stubs/prisma-client.ts") }],
  ["@prisma/client/index.js", { target: path.join(__dirname, "openapi-stubs/prisma-client.ts") }],
  [".prisma/client/default", { target: path.join(__dirname, "openapi-stubs/prisma-client.ts") }],
  [".prisma/client/index.js", { target: path.join(__dirname, "openapi-stubs/prisma-client.ts") }],
]);

Module._resolveFilename = function resolve(request, parent, isMain, options) {
  const overrideTarget = stubOverrides.get(request);
  if (overrideTarget) {
    if (overrideTarget.passthrough) {
      return originalResolveFilename(
        overrideTarget.target,
        parent,
        isMain,
        options,
      );
    }
    return originalResolveFilename(
      overrideTarget.target,
      parent,
      isMain,
      options,
    );
  }
  return originalResolveFilename(request, parent, isMain, options);
};

require("./generate-openapi.ts");
