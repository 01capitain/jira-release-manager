"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "~/lib/utils";

type ScrollAreaRootElement = React.ElementRef<typeof ScrollAreaPrimitive.Root>;
type ScrollAreaRootProps = React.ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.Root
>;

type ScrollAreaViewportElement = React.ElementRef<
  typeof ScrollAreaPrimitive.Viewport
>;

interface EnhancedScrollAreaProps extends ScrollAreaRootProps {
  viewportRef?: React.Ref<ScrollAreaViewportElement>;
  onViewportScroll?: React.UIEventHandler<ScrollAreaViewportElement>;
}

const ScrollArea = React.forwardRef<
  ScrollAreaRootElement,
  EnhancedScrollAreaProps
>(({ className, children, viewportRef, onViewportScroll, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
      ref={viewportRef}
      onScroll={onViewportScroll}
      className="h-full w-full rounded-[inherit]"
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollBar orientation="horizontal" />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none p-0.5 transition-colors select-none",
      orientation === "vertical" ? "h-full w-2.5" : "h-2.5 w-full",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
