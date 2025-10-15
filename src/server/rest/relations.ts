export const collectRelationParams = (
  searchParams: URLSearchParams,
): string[] => {
  // gather every `relations` query key, supporting repeated keys and comma-separated lists
  const values = searchParams.getAll("relations");
  const result: string[] = [];
  for (const raw of values) {
    if (!raw) continue;
    const candidates = raw
      .split(",")
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
    for (const candidate of candidates) {
      result.push(candidate);
    }
  }
  return result;
};
