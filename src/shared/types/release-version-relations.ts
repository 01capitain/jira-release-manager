import type { BuiltVersionDto } from "~/shared/types/built-version";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import type { BuiltVersionTransitionDto } from "~/shared/types/built-version-transition";
import type { ReleaseVersionDto } from "~/shared/types/release-version";
import type { UserSummaryDto } from "~/shared/types/user";

export type ReleaseVersionRelationKey =
  | "creater"
  | "builtVersions"
  | "builtVersions.deployedComponents"
  | "builtVersions.transitions";

export type BuiltVersionWithRelationsDto = BuiltVersionDto & {
  deployedComponents?: ComponentVersionDto[];
  transitions?: BuiltVersionTransitionDto[];
};

export type ReleaseVersionWithRelationsDto = ReleaseVersionDto & {
  creater?: UserSummaryDto;
  builtVersions?: BuiltVersionWithRelationsDto[];
};

