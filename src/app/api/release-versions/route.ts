import { type NextRequest, NextResponse } from "next/server";
import { ReleaseVersionService } from "~/server/api/services/releaseVersion";
import { z } from "zod";

const releaseVersionService = new ReleaseVersionService();

export async function GET() {
  const releaseVersions = await releaseVersionService.getAll();
  return NextResponse.json(releaseVersions);
}

const createSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid body", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const releaseVersion = await releaseVersionService.create(parsed.data);
    return NextResponse.json(releaseVersion, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
}
