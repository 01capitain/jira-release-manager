export type NamingContext = {
  releaseVersion: string;
  builtVersion: string;
  nextIncrement: number;
};

export const AllowedTokens = [
  "{release_version}",
  "{built_version}",
  "{increment}",
] as const;
export type AllowedToken = (typeof AllowedTokens)[number];

export function validatePattern(pattern: string): {
  valid: boolean;
  errors: string[];
} {
  const tokenRegex = /\{[^}]+\}/g;
  const tokens = (pattern.match(tokenRegex) ?? []) as string[];
  const unknown = tokens.filter(
    (t): t is string => !AllowedTokens.includes(t as AllowedToken),
  );
  return {
    valid: unknown.length === 0,
    errors: unknown.map((t) => `Unknown token: ${t}`),
  };
}

export function expandPattern(pattern: string, ctx: NamingContext): string {
  return pattern
    .replaceAll("{release_version}", ctx.releaseVersion)
    .replaceAll("{built_version}", ctx.builtVersion)
    .replaceAll("{increment}", String(ctx.nextIncrement));
}
