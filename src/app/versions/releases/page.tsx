"use client";

import * as React from "react";
import ReleasesAccordion from "./components/releases-accordion";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ReleaseVersionCreateSchema } from "~/shared/schemas/release-version";

export default function VersionsReleasesPage() {
  const utils = api.useUtils();
  const createMutation = api.releaseVersion.create.useMutation();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function createRelease(e?: React.FormEvent) {
    e?.preventDefault();
    if (saving) return;
    setError(null);
    const parsed = ReleaseVersionCreateSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    try {
      await createMutation.mutateAsync({ name: parsed.data.name });
      setName("");
      setOpen(false);
      await utils.builtVersion.listReleasesWithBuilds.invalidate();
    } catch {
      setError("Failed to create release. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
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
              />
            </div>
            <Button type="submit" disabled={saving}>
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
        <div
          role="status"
          aria-atomic="true"
          className="-mt-4 text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </div>
      ) : null}

      <ReleasesAccordion />
    </div>
  );
}
