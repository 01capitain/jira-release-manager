"use client";

import * as React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  ReleaseComponentCreateSchema,
  AllowedBaseColors,
} from "~/shared/schemas/release-component";
import type {
  ReleaseComponentDto,
  ReleaseComponentScope,
} from "~/shared/types/release-component";
import { cn } from "~/lib/utils";
import { ColorSwatchPicker } from "~/components/ui/color-swatch-picker";
import { colorClasses } from "~/shared/ui/color-classes";
import {
  useCreateReleaseComponentMutation,
  useReleaseComponentsQuery,
} from "./api";
import { isRestApiError } from "~/lib/rest-client";

type Phase = "idle" | "loading" | "success";

const scopeOptions: Array<{
  value: ReleaseComponentScope;
  label: string;
  description: string;
}> = [
  {
    value: "version-bound",
    label: "Version-bound",
    description:
      "Include only when a release explicitly selects it during planning.",
  },
  {
    value: "global",
    label: "Global",
    description:
      "Make the component available on every active release automatically.",
  },
];

const scopeMeta = scopeOptions.reduce(
  (acc, option) => {
    acc[option.value] = {
      label: option.label,
      description: option.description,
    };
    return acc;
  },
  {} as Record<ReleaseComponentScope, { label: string; description: string }>,
);

const PREVIEW_RELEASE_VERSION = "v26.1";
const PREVIEW_BUILT_VERSION = `${PREVIEW_RELEASE_VERSION}.0`;
const PREVIEW_INCREMENT = 0;
const DEFAULT_NAMING_PATTERN = "{built_version}";

function expandNamingPreview(pattern: string): string {
  return pattern
    .replaceAll("{release_version}", PREVIEW_RELEASE_VERSION)
    .replaceAll("{built_version}", PREVIEW_BUILT_VERSION)
    .replaceAll("{increment}", String(PREVIEW_INCREMENT));
}

export default function VersionsComponentsPage() {
  const [name, setName] = React.useState("");
  const [pattern, setPattern] = React.useState<string>(DEFAULT_NAMING_PATTERN);
  const [color, setColor] =
    React.useState<(typeof AllowedBaseColors)[number]>("blue");
  const [scope, setScope] = React.useState<ReleaseComponentScope | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const createMutation = useCreateReleaseComponentMutation();
  const { data: componentsPage } = useReleaseComponentsQuery();
  const components = componentsPage?.items ?? [];
  const handleColorChange = React.useCallback((nextColor: string) => {
    if (
      AllowedBaseColors.includes(
        nextColor as (typeof AllowedBaseColors)[number],
      )
    ) {
      setColor(nextColor as (typeof AllowedBaseColors)[number]);
    }
  }, []);

  const previewPattern = pattern.trim() ? pattern : DEFAULT_NAMING_PATTERN;
  const formPreviewName = expandNamingPreview(previewPattern);
  const formPreviewColor = colorClasses(color);
  const formPreviewBadgeClass = cn(
    "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
    formPreviewColor.light,
    formPreviewColor.dark,
    formPreviewColor.text,
  );
  const selectedScopeMeta = scope ? scopeMeta[scope] : null;
  const formScopeChipClass = cn(
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
    scope
      ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
      : "border border-dashed border-neutral-300 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400",
  );
  const formScopeLabel = selectedScopeMeta?.label ?? "Select scope";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase === "loading") return;
    setError(null);
    const parsed = ReleaseComponentCreateSchema.safeParse({
      name,
      color,
      namingPattern: pattern,
      releaseScope: scope,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setPhase("loading");
    try {
      await createMutation.mutateAsync(parsed.data);
      setPhase("success");
      setName("");
      setPattern(DEFAULT_NAMING_PATTERN);
      setColor("blue");
      setScope(null);
      setPhase("idle");
    } catch (err) {
      setPhase("idle");
      setError(
        isRestApiError(err)
          ? err.message
          : "Failed to create component. Please try again.",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Release Components
      </h1>

      <Card>
        <CardContent className="p-6">
          <form
            onSubmit={onSubmit}
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <div className="space-y-2">
              <Label htmlFor="rc-name">Name</Label>
              <Input
                id="rc-name"
                placeholder="e.g., backend.php"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={phase === "loading"}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="rc-pattern">Naming Pattern</Label>
              <Input
                id="rc-pattern"
                placeholder={DEFAULT_NAMING_PATTERN}
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                disabled={phase === "loading"}
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Allowed tokens: {"{release_version}"}, {"{built_version}"},{" "}
                {"{increment}"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Base Color</Label>
              <ColorSwatchPicker
                colors={[...AllowedBaseColors]}
                value={color}
                onChange={handleColorChange}
                ariaLabel="Choose base color"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Uses Tailwind base colors; contrast-friendly in light and dark
                mode.
              </p>
            </div>
            <fieldset className="space-y-3 sm:col-span-3">
              <legend
                id="release-scope-legend"
                className="text-sm font-medium text-neutral-900 dark:text-neutral-100"
              >
                Release Scope
              </legend>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Choose whether the component is planned per release or shared
                across every active release.
              </p>
              <div
                role="radiogroup"
                aria-labelledby="release-scope-legend"
                className="grid gap-2 sm:grid-cols-2"
              >
                {scopeOptions.map((option) => {
                  const selected = scope === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "focus-within:ring-ring flex cursor-pointer flex-col gap-1 rounded-md border p-3 transition focus-within:ring-2",
                        selected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600",
                      )}
                    >
                      <input
                        type="radio"
                        name="release-scope"
                        value={option.value}
                        checked={selected}
                        onChange={() => setScope(option.value)}
                        className="sr-only"
                        aria-label={option.label}
                      />
                      <span className="text-sm font-semibold">
                        {option.label}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {option.description}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="sm:col-span-3">
              <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900/40">
                <div className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                  Preview
                </div>
                <div className="mt-2">
                  <div className="text-base font-semibold">
                    {name.trim() || "Component name"}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={formScopeChipClass}>{formScopeLabel}</span>
                    <span
                      className={formPreviewBadgeClass}
                      title={formPreviewName}
                      aria-label={`Sample component version ${formPreviewName}`}
                    >
                      {formPreviewName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-end justify-between sm:col-span-3">
              {error ? (
                <span
                  role="status"
                  aria-atomic="true"
                  className="text-xs text-red-600 dark:text-red-400"
                >
                  {error}
                </span>
              ) : (
                <span role="status" aria-atomic="true" className="sr-only">
                  {phase === "loading" ? "Saving component" : "Ready"}
                </span>
              )}
              <Button
                type="submit"
                disabled={phase === "loading" || scope === null}
              >
                {phase === "loading" ? "Saving…" : "Add Component"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {components.map((c: ReleaseComponentDto) => {
          const scopeDetails = scopeMeta[c.releaseScope];
          const previewColor = colorClasses(c.color);
          const previewName = expandNamingPreview(c.namingPattern);
          const previewBadgeClass = cn(
            "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
            previewColor.light,
            previewColor.dark,
            previewColor.text,
          );
          return (
            <Card key={c.id}>
              <CardContent className="p-6">
                <div>
                  <div className="text-lg font-semibold">{c.name}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                      {scopeDetails.label}
                    </span>
                    <span
                      className={previewBadgeClass}
                      title={previewName}
                      aria-label={`Sample component version ${previewName}`}
                    >
                      {previewName}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
