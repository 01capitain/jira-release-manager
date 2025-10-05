"use client";

import * as React from "react";
import { cn } from "~/lib/utils";

const COLOR_CLASS_MAP: Record<
  string,
  { bg: string; ring: string; label: string }
> = {
  slate: {
    bg: "bg-slate-500",
    ring: "ring-slate-600 dark:ring-slate-400",
    label: "Slate",
  },
  gray: {
    bg: "bg-gray-500",
    ring: "ring-gray-600 dark:ring-gray-400",
    label: "Gray",
  },
  zinc: {
    bg: "bg-zinc-500",
    ring: "ring-zinc-600 dark:ring-zinc-400",
    label: "Zinc",
  },
  neutral: {
    bg: "bg-neutral-500",
    ring: "ring-neutral-600 dark:ring-neutral-400",
    label: "Neutral",
  },
  stone: {
    bg: "bg-stone-500",
    ring: "ring-stone-600 dark:ring-stone-400",
    label: "Stone",
  },
  red: {
    bg: "bg-red-500",
    ring: "ring-red-600 dark:ring-red-400",
    label: "Red",
  },
  orange: {
    bg: "bg-orange-500",
    ring: "ring-orange-600 dark:ring-orange-400",
    label: "Orange",
  },
  amber: {
    bg: "bg-amber-500",
    ring: "ring-amber-600 dark:ring-amber-400",
    label: "Amber",
  },
  yellow: {
    bg: "bg-yellow-500",
    ring: "ring-yellow-600 dark:ring-yellow-400",
    label: "Yellow",
  },
  lime: {
    bg: "bg-lime-500",
    ring: "ring-lime-600 dark:ring-lime-400",
    label: "Lime",
  },
  green: {
    bg: "bg-green-500",
    ring: "ring-green-600 dark:ring-green-400",
    label: "Green",
  },
  emerald: {
    bg: "bg-emerald-500",
    ring: "ring-emerald-600 dark:ring-emerald-400",
    label: "Emerald",
  },
  teal: {
    bg: "bg-teal-500",
    ring: "ring-teal-600 dark:ring-teal-400",
    label: "Teal",
  },
  cyan: {
    bg: "bg-cyan-500",
    ring: "ring-cyan-600 dark:ring-cyan-400",
    label: "Cyan",
  },
  sky: {
    bg: "bg-sky-500",
    ring: "ring-sky-600 dark:ring-sky-400",
    label: "Sky",
  },
  blue: {
    bg: "bg-blue-500",
    ring: "ring-blue-600 dark:ring-blue-400",
    label: "Blue",
  },
  indigo: {
    bg: "bg-indigo-500",
    ring: "ring-indigo-600 dark:ring-indigo-400",
    label: "Indigo",
  },
  violet: {
    bg: "bg-violet-500",
    ring: "ring-violet-600 dark:ring-violet-400",
    label: "Violet",
  },
  purple: {
    bg: "bg-purple-500",
    ring: "ring-purple-600 dark:ring-purple-400",
    label: "Purple",
  },
  fuchsia: {
    bg: "bg-fuchsia-500",
    ring: "ring-fuchsia-600 dark:ring-fuchsia-400",
    label: "Fuchsia",
  },
  pink: {
    bg: "bg-pink-500",
    ring: "ring-pink-600 dark:ring-pink-400",
    label: "Pink",
  },
  rose: {
    bg: "bg-rose-500",
    ring: "ring-rose-600 dark:ring-rose-400",
    label: "Rose",
  },
};

export type ColorSwatchPickerProps = {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
};

export function ColorSwatchPicker({
  colors,
  value,
  onChange,
  className,
  disabled,
  ariaLabel = "Choose base color",
}: ColorSwatchPickerProps) {
  const selectedIndex = Math.max(0, colors.indexOf(value));
  const ref = React.useRef<HTMLDivElement>(null);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const max = colors.length - 1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(max, selectedIndex + 1);
      onChange(colors[next] ?? value);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(0, selectedIndex - 1);
      onChange(colors[prev] ?? value);
    }
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      tabIndex={0}
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-2", className)}
      onKeyDown={onKeyDown}
    >
      {colors.map((c) => {
        const isSelected = c === value;
        const mapEntry = COLOR_CLASS_MAP[c] ?? COLOR_CLASS_MAP.neutral;
        if (!mapEntry) {
          return null;
        }
        const { bg, ring, label } = mapEntry;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={() => onChange(c)}
            tabIndex={isSelected ? 0 : -1}
            className={cn(
              "h-8 w-8 rounded-full border border-neutral-300 dark:border-neutral-700",
              bg,
              isSelected ? `ring-2 ${ring}` : "ring-0",
              disabled ? "opacity-60" : "transition-transform hover:scale-105",
            )}
          />
        );
      })}
    </div>
  );
}
