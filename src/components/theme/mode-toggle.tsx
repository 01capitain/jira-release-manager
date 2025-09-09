"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "~/components/ui/button";

export function ModeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    try {
      console.log(
        "[theme] mounted:",
        { theme, systemTheme, storage: typeof window !== "undefined" ? localStorage.getItem("jrm-ui-theme") : null },
        "html:",
        typeof document !== "undefined" ? document.documentElement.className : "",
      );
    } catch {
      // noop
    }
  }, [theme, systemTheme]);
  const isDark = (theme === "system" ? systemTheme : theme) === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted ? (
        isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}
