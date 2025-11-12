type CreateEnvParams<TEnv extends Record<string, unknown>> = {
  runtimeEnv?: TEnv;
};

export function createEnv<TEnv extends Record<string, unknown>>({
  runtimeEnv,
}: CreateEnvParams<TEnv>): TEnv {
  return (runtimeEnv ?? {}) as TEnv;
}
