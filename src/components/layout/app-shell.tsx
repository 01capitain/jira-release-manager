"use client";

import {
  ChevronDown,
  ChevronRight,
  Layers,
  LogOut,
  Menu,
  Settings,
} from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { ModeToggle } from "~/components/theme/mode-toggle";
import { Breadcrumbs, type Crumb } from "~/components/ui/breadcrumbs";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { RefreshCw } from "lucide-react";
import { api } from "~/trpc/react";

type NavGroup = {
  id: string;
  label: string;
  icon?: React.ElementType;
  items?: { href: string; label: string }[];
  href?: string;
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "versions",
    label: "Versions",
    icon: Layers,
    items: [
      { href: "/versions/releases", label: "Release Versions" },
      { href: "/versions/components", label: "Release Components" },
    ],
  },
  {
    id: "jira",
    label: "Jira settings",
    icon: Settings,
    items: [
      { href: "/jira-settings/connect", label: "Jira Connect" },
      { href: "/jira-settings/releases", label: "Releases" },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({
    versions: true,
  });

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
    <div className="min-h-screen bg-neutral-900 dark:bg-neutral-100">
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
        {/* Floating container that includes sidebar + content */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex min-h-[70vh]">
            {/* Sidebar inside the floating container */}
            <aside
              className={cn(
                "flex h-auto w-64 shrink-0 flex-col border-r border-neutral-200 bg-white/80 backdrop-blur md:translate-x-0 dark:border-neutral-800 dark:bg-neutral-900/80",
                open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
              )}
            >
              <div className="flex h-14 items-center justify-between gap-2 px-4">
                <div className="flex items-center gap-2 font-semibold">
                  <div
                    className="h-6 w-6 rounded bg-neutral-900 dark:bg-neutral-100"
                    aria-hidden="true"
                  />
                  <span>Jira Release Manager</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setOpen(false)}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              <Separator />
              <nav className="flex-1 overflow-auto px-2 py-3">
                {NAV_GROUPS.map((group) => {
                  const Icon = group.icon;
                  const isExpandable = group.items && group.items.length > 0;
                  const isOpen = expanded[group.id] ?? false;
                  const parentActive = group.items?.some((it) =>
                    pathname.startsWith(it.href),
                  );
                  const directActive = group.href ? pathname === group.href : false;
                  return (
                    <div key={group.id} className="mb-2">
                      {isExpandable ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((e) => ({ ...e, [group.id]: !isOpen }))
                          }
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800",
                            (parentActive || directActive) &&
                              "bg-neutral-100 font-medium dark:bg-neutral-800",
                          )}
                          aria-expanded={isOpen}
                          aria-controls={`submenu-${group.id}`}
                        >
                          {Icon ? <Icon className="h-4 w-4" /> : null}
                          <span className="flex-1">{group.label}</span>
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      ) : group.href ? (
                        <Link
                          href={group.href}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800",
                            directActive &&
                              "bg-neutral-100 font-medium dark:bg-neutral-800",
                          )}
                          onClick={() => setOpen(false)}
                        >
                          {Icon ? <Icon className="h-4 w-4" /> : null}
                          <span className="flex-1">{group.label}</span>
                        </Link>
                      ) : null}

                      {isExpandable && isOpen ? (
                        <div
                          id={`submenu-${group.id}`}
                          className="ml-3 border-l border-neutral-200 pl-3 dark:border-neutral-800"
                        >
                          {(group.items ?? []).map((item) => {
                            const active = pathname.startsWith(item.href);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                  "mb-1 block rounded-md px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800",
                                  active &&
                                    "bg-neutral-100 font-medium dark:bg-neutral-800",
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
                {session?.user ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-neutral-600 dark:text-neutral-300">
                      {session.user.name ?? session.user.email ?? "Signed in"}
                    </span>
                    <Button
                      variant="ghost"
                      className="justify-start gap-2"
                      onClick={async () => {
                        await signOut({ redirect: false });
                        router.refresh();
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full justify-start"
                    onClick={() => void signIn("discord")}
                  >
                    log in per discord sso
                  </Button>
                )}
              </div>
            </aside>

            {/* Content area inside floating container */}
            <div className="flex min-h-full flex-1 flex-col">
              <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-neutral-200 bg-white/80 px-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Breadcrumbs
                  items={computeCrumbs(pathname)}
                  className="hidden md:block"
                />
                <div className="ml-auto flex items-center gap-2">
                  <HeaderActions pathname={pathname} />
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
  if (segments.length === 0)
    return [
      {
        label: "Dashboard",
        href: "/",
      },
    ];
  const map: Record<string, string> = {
    versions: "Versions",
    releases: "Release Versions",
    // 'builds' route is deprecated; treat as Releases for breadcrumbs
    builds: "Release Versions",
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
  if (crumbs.length > 1) {
    const last = crumbs[crumbs.length - 1];
    crumbs[crumbs.length - 1] = { label: last.label };
  }
  return crumbs;
}

function HeaderActions({ pathname }: { pathname: string }) {
  const utils = api.useUtils();
  const [isFetching, setIsFetching] = React.useState(false);
  const isReleases = pathname.startsWith("/versions/releases");
  if (!isReleases) return null;
  async function onRefresh() {
    if (isFetching) return;
    setIsFetching(true);
    try {
      await utils.builtVersion.listReleasesWithBuilds.invalidate();
    } finally {
      setIsFetching(false);
    }
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => void onRefresh()}
      aria-label="Reload releases"
      title="Reload releases"
      disabled={isFetching}
    >
      <RefreshCw className={["h-5 w-5", isFetching ? "animate-spin" : ""].join(" ")} />
      <output className="sr-only" aria-atomic="true">
        {isFetching ? "Refreshing releases" : "Releases up to date"}
      </output>
    </Button>
  );
}
