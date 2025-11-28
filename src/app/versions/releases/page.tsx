"use client";

import * as React from "react";
import ReleasesAccordion from "./components/releases-accordion";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ReleaseVersionCreateSchema } from "~/shared/schemas/release-version";
import { useCreateReleaseMutation } from "./api";
import { isRestApiError } from "~/lib/rest-client";
import { useQueryClient } from "@tanstack/react-query";
import { useReleaseComponentsQuery } from "../components/api";

export default function VersionsReleasesPage() {
  const queryClient = useQueryClient();
  const createMutation = useCreateReleaseMutation();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const { data: releaseComponentsPage } = useReleaseComponentsQuery();

  async function createRelease(e?: React.FormEvent) {
    e?.preventDefault();
    if (saving) return;
    setError(null);
    const trimmed = name.trim();
    const parsed = ReleaseVersionCreateSchema.safeParse({ name: trimmed });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    try {
      await createMutation.mutateAsync({ name: parsed.data.name });
      setName("");
      setOpen(false);
      await queryClient.invalidateQueries({
        queryKey: ["release-versions", "with-patches"],
      });
    } catch (err) {
      setError(
        isRestApiError(err)
          ? err.message
          : "Failed to create release. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const releaseComponentLookup = React.useMemo(() => {
    const items = releaseComponentsPage?.items ?? [];
    return items.reduce<Record<string, { color?: string }>>(
      (acc, component) => {
        acc[component.id] = { color: component.color };
        return acc;
      },
      {},
    );
  }, [releaseComponentsPage]);

  return (
    <div className="mx-auto w-full space-y-6 px-4 sm:px-6 xl:px-8">
      <section className="w-full space-y-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-end justify-start gap-2">
          {!open ? (
            <Button onClick={() => setOpen(true)}>New Release</Button>
          ) : (
            <form
              onSubmit={createRelease}
              className="flex w-full max-w-xl items-end gap-2"
              aria-busy={saving}
            >
              <div className="flex-1">
                <Label htmlFor="release-name" className="sr-only">
                  Release name
                </Label>
                <Input
                  id="release-name"
                  placeholder="e.g., 1.2.0"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                  aria-describedby={error ? "release-name-error" : undefined}
                />
              </div>
              <Button
                type="submit"
                disabled={saving || name.trim().length === 0}
              >
                {saving ? "Creating…" : "Create"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  setName("");
                  setError(null);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </form>
          )}
        </div>
        {error ? (
          <output
            id="release-name-error"
            aria-atomic="true"
            className="-mt-4 block text-xs text-red-600 dark:text-red-400"
          >
            {error}
          </output>
        ) : null}

        <ReleasesAccordion releaseComponentLookup={releaseComponentLookup} />
      </section>
    </div>
  );
}
