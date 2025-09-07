
import { LogOut } from "lucide-react";
import Link from "next/link";

import { auth } from "~/server/auth";

export async function AppSidebar() {
  const session = await auth();

  return (
    <div className="flex h-full flex-col">
      <div className="p-4">
        <h2 className="text-lg font-semibold">Jira Release Manager</h2>
      </div>
      <div className="flex-1 p-4">
        <ul className="flex flex-col gap-1">
          <li>
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500">
                Versions
              </div>
              <ul className="flex flex-col gap-1">
                <li>
                  <Link href="/" className="flex w-full items-center rounded-md p-2 text-sm hover:bg-gray-100">
                    Posts
                  </Link>
                </li>
              </ul>
            </div>
          </li>
        </ul>
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
