import { pathToFileURL } from "node:url";
import { createMatchPath, loadConfig } from "tsconfig-paths";

const configResult = loadConfig();

if (configResult.resultType !== "success") {
  console.error("Failed to load tsconfig for path mapping:");
  console.error(configResult);
}

const matchPath =
  configResult.resultType === "success"
    ? createMatchPath(configResult.absoluteBaseUrl, configResult.paths)
    : null;

export async function resolve(specifier, context, nextResolve) {
  if (matchPath) {
    const mapped = matchPath(specifier, undefined, undefined, [
      ".ts",
      ".tsx",
      ".js",
      ".mjs",
      ".cjs",
      ".json",
    ]);
    if (mapped) {
      const url = pathToFileURL(mapped).href;
      return nextResolve(url, context);
    }
  }

  return nextResolve(specifier, context);
}
