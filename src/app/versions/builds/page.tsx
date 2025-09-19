import { redirect } from "next/navigation";

export default function VersionsBuildsPage() {
  // View deprecated: merged into Releases
  redirect("/versions/releases");
}
