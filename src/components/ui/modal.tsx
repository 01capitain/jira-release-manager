"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { cn } from "~/lib/utils";

type ModalProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  title?: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function Modal({ open, onOpenChange, title, description, children, footer, className }: ModalProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!mounted) return null;

  return ReactDOM.createPortal(
    open ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        aria-hidden={!open}
      >
        <div
          className="absolute inset-0 bg-black/20"
          onClick={() => onOpenChange(false)}
        />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          className={cn(
            "relative z-10 w-full max-w-3xl rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900",
            className,
          )}
        >
          {(title || description) && (
            <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold">
                  {title}
                </h2>
              )}
              {description && (
                <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  {description}
                </div>
              )}
            </div>
          )}
          <div className="max-h-[60vh] overflow-auto p-4">{children}</div>
          {footer && (
            <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
              <div className="flex items-center justify-end gap-2">{footer}</div>
            </div>
          )}
        </div>
      </div>
    ) : null,
    document.body,
  );
}
