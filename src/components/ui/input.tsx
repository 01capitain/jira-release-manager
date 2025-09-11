import * as React from "react";
import { cn } from "~/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "ring-offset-background flex h-10 w-full min-w-0 rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:focus-visible:ring-neutral-100",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
