import type { PatchDto } from "~/shared/types/patch";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import type { PatchTransitionDto } from "~/shared/types/patch-transition";
import type { ReleaseVersionDto } from "~/shared/types/release-version";
import type { UserSummaryDto } from "~/shared/types/user";

export type ReleaseVersionRelationKey =
  | "creater"
  | "patches"
  | "patches.deployedComponents"
  | "patches.transitions";

export type PatchWithRelationsDto = PatchDto & {
  deployedComponents?: ComponentVersionDto[];
  transitions?: PatchTransitionDto[];
};

export type ReleaseVersionWithRelationsDto = ReleaseVersionDto & {
  creater?: UserSummaryDto;
  patches?: PatchWithRelationsDto[];
};

