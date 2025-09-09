"use client";

import * as React from "react";
import { Plus, Check, X, Loader2 } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { GlowingEffect } from "~/components/ui/glowing-effect";

import { addReleaseVersion, type ReleaseVersion } from "./release-storage";

export default function AddReleaseCard({ onCreated }: { onCreated?: (item: ReleaseVersion) => void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setName("");
    setError(null);
    setSubmitted(false);
    setOpen(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (isSubmitting) return;
    if (!name.trim()) {
      setError("Please enter a name.");
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    const item = addReleaseVersion(name.trim());
    setSubmitted(true);
    onCreated?.(item);
    setIsSubmitting(false);
    // auto-collapse back to the "+" card shortly after success
    setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
      setName("");
    }, 700);
  }

  return (
    <GlowingEffect active={isSubmitting} thickness={isSubmitting ? "thick" : "thin"} className="h-full">
      <Card
        className={cn(
          "group relative h-72 cursor-pointer overflow-hidden transition-shadow hover:shadow-md",
          isSubmitting && "border-green-400/60",
        )}
      >
      {!open ? (
        <button
          type="button"
          aria-label="Add release version"
          className="flex h-full w-full items-center justify-center"
          onClick={() => setOpen(true)}
        >
          <div className="flex flex-col items-center justify-center text-neutral-400 transition-transform group-hover:scale-105 group-hover:text-neutral-500 dark:text-neutral-500 dark:group-hover:text-neutral-300">
            <Plus className="h-20 w-20" />
            <span className="mt-2 text-sm">New Release Version</span>
          </div>
        </button>
      ) : (
        <CardContent className="p-6 min-h-72">
          {submitted ? (
            <div className="flex h-44 flex-col items-center justify-center gap-3 animate-in">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                <Check className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Release version created</p>
                <p className="text-base font-medium">{name}</p>
              </div>
              <Button className="mt-1" onClick={reset} variant="secondary">
                Add another
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">New Release Version</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Enter details to create a release.</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={reset} aria-label="Close" disabled={isSubmitting}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="release-name">Name</Label>
                <Input
                  id="release-name"
                  placeholder="e.g., 1.2.0"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  className={cn(error && "border-red-500 focus-visible:ring-red-600 dark:border-red-600")}
                />
                {error ? (
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                ) : (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">This will be the tag of your release.</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span>
                  ) : (
                    "Create"
                  )}
                </Button>
                <Button type="button" variant="secondary" onClick={reset} disabled={isSubmitting}>
                  Cancel
                </Button>
              </div>
              {isSubmitting && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-emerald-50/60 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                  <span className="text-sm font-medium">Thinking<span className="jrm-thinking" /></span>
                </div>
              )}
            </form>
          )}
        </CardContent>
      )}
      </Card>
    </GlowingEffect>
  );
}
