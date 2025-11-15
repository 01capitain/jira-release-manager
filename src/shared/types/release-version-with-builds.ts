import type { ReleaseVersionDto } from "~/shared/types/release-version";
import type { BuiltVersionDto } from "~/shared/types/built-version";
import type { ComponentVersionDto } from "~/shared/types/component-version";

export type ReleaseBuiltVersionDto = BuiltVersionDto & {
  deployedComponents?: ComponentVersionDto[];
};

export type ReleaseVersionWithBuildsDto = ReleaseVersionDto & {
  builtVersions: ReleaseBuiltVersionDto[];
};
