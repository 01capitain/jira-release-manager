/*
  NOTE: This is a reusable Label primitive. Consumers are responsible for
  associating it with a control via `htmlFor` or by nesting the control.
  We disable the a11y rule here to avoid false positives on the primitive itself.
*/
/* eslint-disable jsx-a11y/label-has-associated-control */
import * as React from "react";
import { cn } from "~/lib/utils";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  ),
);
Label.displayName = "Label";

export { Label };
