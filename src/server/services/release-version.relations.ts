import type { ReleaseVersionRelationKey } from "~/shared/types/release-version-relations";

type ParentMap = Record<ReleaseVersionRelationKey, ReleaseVersionRelationKey | null>;

const ParentRelation: ParentMap = {
  creater: null,
  builtVersions: null,
  "builtVersions.deployedComponents": "builtVersions",
  "builtVersions.transitions": "builtVersions",
};

const AllowedRelations = new Set<ReleaseVersionRelationKey>([
  "creater",
  "builtVersions",
  "builtVersions.deployedComponents",
  "builtVersions.transitions",
]);

export type ReleaseVersionRelationValidation = {
  valid: ReleaseVersionRelationKey[];
  invalid: string[];
  missingParents: string[];
};

export const validateReleaseVersionRelations = (
  requested: string[],
): ReleaseVersionRelationValidation => {
  const invalid: string[] = [];
  const deduped: ReleaseVersionRelationKey[] = [];

  for (const raw of requested) {
    if (!AllowedRelations.has(raw as ReleaseVersionRelationKey)) {
      invalid.push(raw);
      continue;
    }
    const typed = raw as ReleaseVersionRelationKey;
    if (!deduped.includes(typed)) {
      deduped.push(typed);
    }
  }

  const missingParents: string[] = [];
  const valid: ReleaseVersionRelationKey[] = [];
  for (const key of deduped) {
    const parent = ParentRelation[key];
    if (parent && !deduped.includes(parent)) {
      missingParents.push(key);
      continue;
    }
    valid.push(key);
  }

  return { valid, invalid, missingParents };
};

export type ReleaseVersionRelationState = {
  includeCreater: boolean;
  includeBuiltVersions: boolean;
  includeBuiltVersionComponents: boolean;
  includeBuiltVersionTransitions: boolean;
};

export const buildReleaseVersionRelationState = (
  relations: ReleaseVersionRelationKey[],
): ReleaseVersionRelationState => {
  const includeBuiltVersions =
    relations.includes("builtVersions") ||
    relations.includes("builtVersions.deployedComponents") ||
    relations.includes("builtVersions.transitions");

  return {
    includeCreater: relations.includes("creater"),
    includeBuiltVersions,
    includeBuiltVersionComponents: relations.includes(
      "builtVersions.deployedComponents",
    ),
    includeBuiltVersionTransitions: relations.includes(
      "builtVersions.transitions",
    ),
  };
};

export const RELEASE_VERSION_RELATION_ALLOW_LIST: ReleaseVersionRelationKey[] =
  Array.from(AllowedRelations);

