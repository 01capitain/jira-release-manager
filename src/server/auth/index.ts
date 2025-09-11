import NextAuth from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";

const {
  auth: uncachedAuth,
  handlers: rawHandlers,
  signIn,
  signOut,
} = NextAuth(authConfig);

type NextAuthRouteHandler = (request: Request) => Promise<Response>;
type NormalizedHandlers = {
  GET: NextAuthRouteHandler;
  POST: NextAuthRouteHandler;
};

const isRouteHandler = (fn: unknown): fn is NextAuthRouteHandler =>
  typeof fn === "function";
const isMethodHandlers = (h: unknown): h is NormalizedHandlers =>
  typeof h === "object" &&
  h !== null &&
  "GET" in (h as Record<string, unknown>) &&
  "POST" in (h as Record<string, unknown>) &&
  typeof (h as Record<string, unknown>).GET === "function" &&
  typeof (h as Record<string, unknown>).POST === "function";

// Normalize handlers to always expose GET and POST functions
let handlers: NormalizedHandlers;
if (isMethodHandlers(rawHandlers)) {
  handlers = rawHandlers;
} else if (isRouteHandler(rawHandlers)) {
  handlers = { GET: rawHandlers, POST: rawHandlers };
} else {
  throw new Error("Invalid NextAuth handlers export");
}

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };
