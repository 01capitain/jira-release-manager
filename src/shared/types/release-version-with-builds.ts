import type { ReleaseVersionDto } from "~/shared/types/release-version";
import type { BuiltVersionDto } from "~/shared/types/built-version";

export type ReleaseVersionWithBuildsDto = ReleaseVersionDto & {
  builtVersions: BuiltVersionDto[];
};
