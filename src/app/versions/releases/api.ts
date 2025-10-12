"use client";

import { useMutation } from "@tanstack/react-query";

import type { ReleaseVersionDto } from "~/shared/types/release-version";
import type { ReleaseVersionCreateInput } from "~/shared/schemas/release-version";
import { postJson } from "~/lib/rest-client";

export const createReleaseVersion = async (
  input: ReleaseVersionCreateInput,
): Promise<ReleaseVersionDto> => {
  return postJson<ReleaseVersionCreateInput, ReleaseVersionDto>(
    "/api/v1/release-versions",
    input,
  );
};

export const useCreateReleaseMutation = () => {
  return useMutation({
    mutationFn: createReleaseVersion,
  });
};
