"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronRight, LayoutDashboard, Package, Blocks, Settings, LogOut } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ModeToggle } from "~/components/theme/mode-toggle";
import { Separator } from "~/components/ui/separator";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/releases", label: "Releases", icon: Package },
  { href: "/builds", label: "Builds", icon: Blocks },
  { href: "/components", label: "Components", icon: Blocks },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const html = document.documentElement.className;
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      console.log("[appshell] html classes:", html, "body bg:", bodyBg);
    } catch {
      // noop
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1225] text-neutral-900 dark:text-neutral-100">
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
        {/* Floating container that includes sidebar + content */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex min-h-[70vh]">
            {/* Sidebar inside the floating container */}
            <aside
              className={cn(
                "w-64 shrink-0 border-r border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80 md:translate-x-0",
                open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
              )}
            >
              <div className="flex h-14 items-center justify-between gap-2 px-4">
                <div className="flex items-center gap-2 font-semibold">
                  <div className="h-6 w-6 rounded bg-neutral-900 dark:bg-neutral-100" />
                  <span>Jira Release Manager</span>
                </div>
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(false)}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              <Separator />
              <nav className="px-2 py-3">
                {NAV_ITEMS.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800",
                        active && "bg-neutral-100 font-medium dark:bg-neutral-800",
                      )}
                      onClick={() => setOpen(false)}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                <Separator className="my-3" />
                <Link href="/api/auth/signout" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </Link>
              </nav>
            </aside>

            {/* Content area inside floating container */}
            <div className="flex min-h-full flex-1 flex-col">
              <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-neutral-200 bg-white/80 px-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="ml-auto flex items-center gap-2">
                  <ModeToggle />
                </div>
              </header>
              <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
