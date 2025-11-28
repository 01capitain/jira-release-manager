import type { ReleaseVersionRelationKey } from "~/shared/types/release-version-relations";

const TopLevelRelations = [
  "creater",
  "patches",
] as const satisfies readonly ReleaseVersionRelationKey[];

type ParentMap = Record<
  ReleaseVersionRelationKey,
  ReleaseVersionRelationKey | null
>;

const ParentRelation: ParentMap = {
  creater: null,
  patches: null,
  "patches.deployedComponents": "patches",
  "patches.transitions": "patches",
};

const AllowedRelations = new Set<ReleaseVersionRelationKey>([
  ...TopLevelRelations,
  "patches.deployedComponents",
  "patches.transitions",
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
  includePatches: boolean;
  includePatchComponents: boolean;
  includePatchTransitions: boolean;
};

export const buildReleaseVersionRelationState = (
  relations: ReleaseVersionRelationKey[],
): ReleaseVersionRelationState => {
  const includePatches =
    relations.includes("patches") ||
    relations.includes("patches.deployedComponents") ||
    relations.includes("patches.transitions");

  return {
    includeCreater: relations.includes("creater"),
    includePatches,
    includePatchComponents: relations.includes(
      "patches.deployedComponents",
    ),
    includePatchTransitions: relations.includes(
      "patches.transitions",
    ),
  };
};

export const RELEASE_VERSION_RELATION_ALLOW_LIST: ReleaseVersionRelationKey[] =
  Array.from(AllowedRelations);

export const RELEASE_VERSION_TOP_LEVEL_RELATIONS = TopLevelRelations;
