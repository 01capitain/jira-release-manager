"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronRight, ChevronDown, ChevronRight as CaretRight, Settings, LogOut, Layers } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ModeToggle } from "~/components/theme/mode-toggle";
import { Separator } from "~/components/ui/separator";
import { Breadcrumbs, type Crumb } from "~/components/ui/breadcrumbs";

type NavGroup = {
  id: string;
  label: string;
  icon?: React.ElementType;
  items?: { href: string; label: string }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "versions",
    label: "Versions",
    icon: Layers,
    items: [
      { href: "/versions/releases", label: "Release Versions" },
      { href: "/versions/builds", label: "Built Versions" },
      { href: "/versions/components", label: "Release Components" },
    ],
  },
  {
    id: "jira",
    label: "Jira settings",
    icon: Settings,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({ versions: true });

  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      try {
        const html = document.documentElement.className;
        const bodyBg = getComputedStyle(document.body).backgroundColor;
        console.log("[appshell] html classes:", html, "body bg:", bodyBg);
      } catch {
        // noop
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1225] dark:bg-neutral-100 text-neutral-900 dark:text-neutral-100">
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
        {/* Floating container that includes sidebar + content */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex min-h-[70vh]">
            {/* Sidebar inside the floating container */}
            <aside
              className={cn(
                "flex h-auto w-64 shrink-0 flex-col border-r border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80 md:translate-x-0",
                open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
              )}
            >
              <div className="flex h-14 items-center justify-between gap-2 px-4">
                <div className="flex items-center gap-2 font-semibold">
                  <div className="h-6 w-6 rounded bg-neutral-900 dark:bg-neutral-100" aria-hidden="true" />
                  <span>Jira Release Manager</span>
                </div>
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(false)}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              <Separator />
              <nav className="flex-1 overflow-auto px-2 py-3">
                {NAV_GROUPS.map((group) => {
                  const Icon = group.icon;
                  const isExpandable = group.items && group.items.length > 0;
                  const isOpen = expanded[group.id] ?? false;
                  const parentActive = group.items?.some((it) => pathname.startsWith(it.href));
                  return (
                    <div key={group.id} className="mb-2">
                      <button
                        type="button"
                        onClick={() => isExpandable && setExpanded((e) => ({ ...e, [group.id]: !isOpen }))}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800",
                          parentActive && "bg-neutral-100 font-medium dark:bg-neutral-800",
                        )}
                      >
                        {Icon ? <Icon className="h-4 w-4" /> : null}
                        <span className="flex-1">{group.label}</span>
                        {isExpandable ? (
                          isOpen ? <ChevronDown className="h-4 w-4" /> : <CaretRight className="h-4 w-4" />
                        ) : null}
                      </button>

                      {isExpandable && isOpen ? (
                        <div className="ml-3 border-l border-neutral-200 pl-3 dark:border-neutral-800">
                          {group.items!.map((item) => {
                            const active = pathname.startsWith(item.href);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                  "mb-1 block rounded-md px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800",
                                  active && "bg-neutral-100 font-medium dark:bg-neutral-800",
                                )}
                                onClick={() => setOpen(false)}
                              >
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

              </nav>
              <Separator className="mt-2" />
              <div className="px-2 py-3">
                <Link href="/api/auth/signout" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </Link>
              </div>
            </aside>

            {/* Content area inside floating container */}
            <div className="flex min-h-full flex-1 flex-col">
              <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-neutral-200 bg-white/80 px-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>
                <Breadcrumbs items={computeCrumbs(pathname)} className="hidden md:block" />
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

function computeCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Dashboard", href: "/" }];
  const map: Record<string, string> = {
    versions: "Versions",
    releases: "Release Versions",
    builds: "Built Versions",
    components: "Release Components",
    "jira-settings": "Jira settings",
  };
  const crumbs: Crumb[] = [{ label: "Dashboard", href: "/" }];
  let href = "";
  for (const seg of segments) {
    href += `/${seg}`;
    const label = map[seg] ?? decodeURIComponent(seg).replace(/-/g, " ");
    crumbs.push({ label, href });
  }
  // Mark last as current (no href)
  if (crumbs.length > 1) crumbs[crumbs.length - 1] = { label: crumbs[crumbs.length - 1]!.label } as Crumb;
  return crumbs;
}
