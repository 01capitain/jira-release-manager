import { redirect } from "next/navigation";

export default function BuildsPage() {
  // The builds view is now merged into Releases
  redirect("/versions/releases");
}
