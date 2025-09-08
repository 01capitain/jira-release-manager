
import { LogOut } from "lucide-react";
import Link from "next/link";

import { auth } from "~/server/auth";

export async function AppSidebar() {
  const session = await auth();

  return (
    <aside className="flex h-full flex-col border-r bg-background">
      <div className="p-4">
        <h2 className="text-lg font-semibold">Jira Release Manager</h2>
      </div>
      <nav aria-label="Primary" className="flex-1 p-4">
        <ul className="flex flex-col gap-1">
          <li>
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground">
                Versions
              </div>
              <ul className="flex flex-col gap-1">
                <li>
                  <Link
                    href="/"
                    className="flex w-full items-center rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    Posts
                  </Link>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </nav>
      </div>
      <div className="p-4">
        {session?.user ? (
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{session.user.name}</p>
            <Link href="/api/auth/signout" className="ml-auto">
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <Link
            href="/api/auth/signin"
            className="text-sm text-gray-500"
          >
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
