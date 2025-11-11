"use client";

import { useEffect } from "react";

import { initializeClientTelemetry } from "~/lib/otel/client";

export const TelemetryProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  useEffect(() => {
    initializeClientTelemetry();
  }, []);

  return <>{children}</>;
};
