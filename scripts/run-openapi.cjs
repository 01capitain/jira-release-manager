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
        "~/*": ["src/*"],
        "next/server": ["scripts/openapi-stubs/next-server"],
        "@prisma/client": ["scripts/openapi-stubs/prisma-client"],
        "next-auth": ["scripts/openapi-stubs/next-auth"],
      },
    },
  },
});

const Module = require("module");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolve(request, parent, isMain, options) {
  if (request === "zod") {
    return originalResolveFilename("zod/v4", parent, isMain, options);
  }
  return originalResolveFilename(request, parent, isMain, options);
};

require("./generate-openapi.cts");
