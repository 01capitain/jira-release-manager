import type { ReleaseVersionDto } from "~/shared/types/release-version";
import type { PatchDto } from "~/shared/types/patch";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import type { PatchTransitionDto } from "~/shared/types/patch-transition";

export type ReleasePatchDto = PatchDto & {
  deployedComponents?: ComponentVersionDto[];
  transitions?: PatchTransitionDto[];
  hasComponentData?: boolean;
  hasStatusData?: boolean;
};

export type ReleaseVersionWithPatchesDto = ReleaseVersionDto & {
  patches: ReleasePatchDto[];
};
