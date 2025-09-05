import { revalidatePath } from "next/cache";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  const releaseVersions = await api.releaseVersion.getAll();

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Release Versions
          </h1>
          <div>
            <form
              action={async (formData) => {
                "use server";
                const raw = formData.get("name");
                const name = typeof raw === "string" ? raw.trim() : "";
                if (!name) return;
                await api.releaseVersion.create({ name });
                revalidatePath("/");
              }}
            >
              <input type="text" name="name" required minLength={1} placeholder="Release version name" />
              <button type="submit">Create</button>
            </form>
          </div>
          <div className="flex flex-col items-center gap-2">
            {releaseVersions.map((rv) => (
              <div key={rv.id}>{rv.name}</div>
            ))}
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
