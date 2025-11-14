"use client";

import { initializeClientTelemetry } from "~/lib/otel/client";

if (typeof window !== "undefined") {
  initializeClientTelemetry();
}

export const TelemetryProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <>{children}</>;
};
