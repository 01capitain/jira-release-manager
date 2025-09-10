import Link from "next/link";

import { LatestPost } from "~/app/_components/post";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
  }

  return (
    <HydrateClient>
      <div className="space-y-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {session ? `Welcome, ${session.user?.name ?? "user"}` : "Not signed in"}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-neutral-100 p-4 dark:bg-neutral-800/60">
          <div>
            <h3 className="mb-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Status
            </h3>
-           <p className="text-lg font-semibold">
-             {hello ? hello.greeting : "Loading..."}
           <p className="text-lg font-semibold">
             {hello.greeting}
           </p>
          </div>
          <Link
            className="rounded-lg bg-neutral-100 p-4 transition hover:bg-neutral-200 dark:bg-neutral-800/60 dark:hover:bg-neutral-800"
            href="/versions/releases"
          >
            <h3 className="mb-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">Manage</h3>
            <p className="text-lg font-semibold">Releases</p>
          </Link>
          <Link
            className="rounded-lg bg-neutral-100 p-4 transition hover:bg-neutral-200 dark:bg-neutral-800/60 dark:hover:bg-neutral-800"
            href="/versions/builds"
          >
            <h3 className="mb-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">Inspect</h3>
            <p className="text-lg font-semibold">Builds</p>
          </Link>
        </div>

        {session?.user && (
          <div className="rounded-lg bg-neutral-100 p-4 dark:bg-neutral-800/60">
            <h2 className="mb-2 text-lg font-semibold">Latest Post</h2>
            <LatestPost />
          </div>
        )}
      </div>
    </HydrateClient>
  );
}
