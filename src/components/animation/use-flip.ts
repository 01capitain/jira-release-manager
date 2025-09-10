"use client";

import * as React from "react";

const rects = new Map<string, DOMRect>();

export function useFlip(id: string) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = el.getBoundingClientRect();
    const prev = rects.get(id);
    let cleanup: (() => void) | undefined;

    if (prev) {
      const dx = prev.left - next.left;
      const dy = prev.top - next.top;
      if (dx || dy) {
        el.style.willChange = "transform";
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        // Force reflow
        void el.getBoundingClientRect();
        const dev = process.env.NODE_ENV === "development";
        const ms = dev ? 5000 : 600;
        el.style.transition = `transform ${ms}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        el.style.transform = "translate(0, 0)";
        const done = () => {
          el.style.transition = "";
          el.style.willChange = "";
          el.removeEventListener("transitionend", done);
        };
        el.addEventListener("transitionend", done);
        cleanup = () => el.removeEventListener("transitionend", done);
      }
    }

    rects.set(id, next);
    return () => {
      cleanup?.();
    };
  });

  return ref;
}
