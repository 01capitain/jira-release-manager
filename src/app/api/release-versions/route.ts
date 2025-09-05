import { type NextRequest, NextResponse } from "next/server";
import { ReleaseVersionService } from "~/server/api/services/releaseVersion";
import { z } from "zod";

const releaseVersionService = new ReleaseVersionService();

export async function GET() {
  const releaseVersions = await releaseVersionService.getAll();
  return NextResponse.json(releaseVersions);
}

const createSchema = z.object({
  name: z.string(),
});

export async function POST(request: NextRequest) {
  const json = (await request.json()) as { name: string };
  const data = createSchema.parse(json);
  const releaseVersion = await releaseVersionService.create(data);
  return NextResponse.json(releaseVersion);
}
