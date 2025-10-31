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

export default function VersionsComponentsPage() {
  const [name, setName] = React.useState("");
  const [pattern, setPattern] = React.useState(
    "{release_version}-{built_version}-{increment}",
  );
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
      setPattern("{release_version}-{built_version}-{increment}");
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
                placeholder="{release_version}-{built_version}-{increment}"
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
          return (
            <Card key={c.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">{c.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                        {scopeDetails.label}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {scopeDetails.description}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {c.namingPattern}
                    </div>
                  </div>
                  {(() => {
                    const swatch: Record<string, string> = {
                      slate: "bg-slate-500",
                      gray: "bg-gray-500",
                      zinc: "bg-zinc-500",
                      neutral: "bg-neutral-500",
                      stone: "bg-stone-500",
                      red: "bg-red-500",
                      orange: "bg-orange-500",
                      amber: "bg-amber-500",
                      yellow: "bg-yellow-500",
                      lime: "bg-lime-500",
                      green: "bg-green-500",
                      emerald: "bg-emerald-500",
                      teal: "bg-teal-500",
                      cyan: "bg-cyan-500",
                      sky: "bg-sky-500",
                      blue: "bg-blue-500",
                      indigo: "bg-indigo-500",
                      violet: "bg-violet-500",
                      purple: "bg-purple-500",
                      fuchsia: "bg-fuchsia-500",
                      pink: "bg-pink-500",
                      rose: "bg-rose-500",
                    };
                    const cls = swatch[c.color] ?? swatch.neutral;
                    return (
                      <div
                        className={["h-6 w-6 rounded-full border", cls].join(
                          " ",
                        )}
                        title={c.color}
                        aria-label={`Base color ${c.color}`}
                      />
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
