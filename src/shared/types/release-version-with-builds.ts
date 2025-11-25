import type { ReleaseVersionDto } from "~/shared/types/release-version";
import type { BuiltVersionDto } from "~/shared/types/built-version";
import type { ComponentVersionDto } from "~/shared/types/component-version";
import type { BuiltVersionTransitionDto } from "~/shared/types/built-version-transition";

export type ReleaseBuiltVersionDto = BuiltVersionDto & {
  deployedComponents?: ComponentVersionDto[];
  transitions?: BuiltVersionTransitionDto[];
  hasComponentData?: boolean;
  hasStatusData?: boolean;
};

export type ReleaseVersionWithBuildsDto = ReleaseVersionDto & {
  builtVersions: ReleaseBuiltVersionDto[];
};
