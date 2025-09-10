/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/versions/releases",
        permanent: true,
      },
      {
        source: "/releases",
        destination: "/versions/releases",
        permanent: true,
      },
    ];
  },
};

export default config;
