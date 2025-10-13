"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";

import { createQueryClient } from "~/lib/query-client";

let browserQueryClient: QueryClient | undefined;

const getQueryClient = () => {
  if (typeof window === "undefined") {
    return createQueryClient();
  }
  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
};

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(getQueryClient);
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
